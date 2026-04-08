/**
 * Migration: Promote resource metadata fields to top-level schema columns.
 *
 * Non-destructive: reads metadata, writes promoted fields to top-level.
 * Does NOT delete metadata (backward compat). Run once after schema deploy.
 *
 * Usage: npx convex run migrations/promoteResourceMetadata:run
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/** List resources that have metadata but no top-level promoted fields yet. */
export const status = query({
    args: { tenantId: v.string() },
    handler: async (ctx, { tenantId }) => {
        const allResources = await ctx.runQuery(components.resources.queries.listAll, {
            tenantId,
            limit: 500,
        }).catch(() => []);

        let needsMigration = 0;
        let alreadyMigrated = 0;
        let total = 0;

        for (const r of allResources as any[]) {
            total++;
            const meta = r.metadata as Record<string, unknown> | undefined;
            // Consider migrated if location is promoted or no metadata to promote
            if (r.location || !meta || Object.keys(meta).length === 0) {
                alreadyMigrated++;
            } else {
                needsMigration++;
            }
        }

        return { total, needsMigration, alreadyMigrated };
    },
});

/** Promote metadata fields to top-level for a single resource. */
function extractPromotedFields(meta: Record<string, unknown>) {
    const promoted: Record<string, unknown> = {};

    // Location
    if (meta.location || meta.address || meta.city) {
        const metaLoc = (meta.location ?? {}) as Record<string, unknown>;
        const coords = (meta.coordinates ?? {}) as Record<string, unknown>;
        promoted.location = {
            address: metaLoc.address ?? meta.address,
            city: metaLoc.city ?? meta.city,
            postalCode: metaLoc.postalCode ?? meta.postalCode,
            municipality: metaLoc.municipality,
            country: metaLoc.country,
            lat: metaLoc.lat ?? coords.lat ?? meta.latitude,
            lng: metaLoc.lng ?? coords.lng ?? meta.longitude,
        };
    }

    // Display
    if (meta.visibility) promoted.visibility = meta.visibility;
    if (meta.fullDescription) promoted.fullDescription = meta.fullDescription;
    if (Array.isArray(meta.highlights)) promoted.highlights = meta.highlights;

    // Venue/Space
    if (typeof meta.areaSquareMeters === 'number') promoted.areaSquareMeters = meta.areaSquareMeters;
    if (typeof meta.floors === 'number') promoted.floors = meta.floors;
    if (meta.capacityDetails) promoted.capacityDetails = meta.capacityDetails;
    if (meta.technicalSpecs) promoted.technicalSpecs = meta.technicalSpecs;
    if (meta.venueDimensions) promoted.venueDimensions = meta.venueDimensions;
    if (meta.parkingInfo) promoted.parkingInfo = meta.parkingInfo;
    if (meta.contactEmail) promoted.contactEmail = meta.contactEmail;
    if (meta.pricingDescription || meta.pricingInfo) {
        promoted.pricingDescription = meta.pricingDescription ?? meta.pricingInfo;
    }

    // Content arrays
    if (Array.isArray(meta.faq)) {
        promoted.faq = (meta.faq as any[]).map((f: any) => ({
            question: f.question ?? '',
            answer: f.answer ?? '',
        }));
    }
    if (Array.isArray(meta.rules)) {
        promoted.rules = (meta.rules as any[]).map((r: any) => ({
            title: r.title ?? '',
            description: r.content ?? r.description,
            type: r.category ?? r.type,
        }));
    }
    if (Array.isArray(meta.documents)) promoted.documents = meta.documents;

    // Booking config
    if (meta.bookingConfig) promoted.bookingConfig = meta.bookingConfig;

    return promoted;
}

/** Normalize location shape from mixed legacy formats. */
function normalizeLocation(
    current: Record<string, unknown> | undefined,
    meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    const cur = (current ?? {}) as Record<string, unknown>;
    const m = (meta ?? {}) as Record<string, unknown>;
    const metaLoc = (m.location ?? {}) as Record<string, unknown>;
    const coords = (m.coordinates ?? {}) as Record<string, unknown>;

    const address =
        (cur.address as string | undefined) ??
        (metaLoc.address as string | undefined) ??
        (m.address as string | undefined);
    const city =
        (cur.city as string | undefined) ??
        (metaLoc.city as string | undefined) ??
        (m.city as string | undefined);
    const postalCode =
        (cur.postalCode as string | undefined) ??
        (metaLoc.postalCode as string | undefined) ??
        (m.postalCode as string | undefined);
    const municipality =
        (cur.municipality as string | undefined) ??
        (metaLoc.municipality as string | undefined);
    const country =
        (cur.country as string | undefined) ??
        (metaLoc.country as string | undefined);

    const lat =
        (cur.lat as number | undefined) ??
        (cur.latitude as number | undefined) ??
        (metaLoc.lat as number | undefined) ??
        (metaLoc.latitude as number | undefined) ??
        (coords.lat as number | undefined) ??
        (m.latitude as number | undefined);
    const lng =
        (cur.lng as number | undefined) ??
        (cur.longitude as number | undefined) ??
        (metaLoc.lng as number | undefined) ??
        (metaLoc.longitude as number | undefined) ??
        (coords.lng as number | undefined) ??
        (m.longitude as number | undefined);

    const normalized: Record<string, unknown> = {
        ...(address ? { address } : {}),
        ...(city ? { city } : {}),
        ...(postalCode ? { postalCode } : {}),
        ...(municipality ? { municipality } : {}),
        ...(country ? { country } : {}),
        ...(typeof lat === "number" ? { lat } : {}),
        ...(typeof lng === "number" ? { lng } : {}),
    };

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function locationEquals(
    a: Record<string, unknown> | undefined,
    b: Record<string, unknown> | undefined
): boolean {
    const keys: Array<"address" | "city" | "postalCode" | "municipality" | "country" | "lat" | "lng"> = [
        "address",
        "city",
        "postalCode",
        "municipality",
        "country",
        "lat",
        "lng",
    ];
    const aa = (a ?? {}) as Record<string, unknown>;
    const bb = (b ?? {}) as Record<string, unknown>;
    return keys.every((k) => aa[k] === bb[k]);
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
}

function haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Run migration: promote metadata to top-level for all resources. */
export const run = mutation({
    args: { tenantId: v.string(), dryRun: v.optional(v.boolean()) },
    handler: async (ctx, { tenantId, dryRun }) => {
        const allResources = await ctx.runQuery(components.resources.queries.listAll, {
            tenantId,
            limit: 500,
        }).catch(() => []);

        let migrated = 0;
        let skipped = 0;

        for (const r of allResources as any[]) {
            const meta = r.metadata as Record<string, unknown> | undefined;
            if (!meta || Object.keys(meta).length === 0) {
                skipped++;
                continue;
            }
            // Skip if already has promoted location field
            if (r.location) {
                skipped++;
                continue;
            }

            const promoted = extractPromotedFields(meta);
            if (Object.keys(promoted).length === 0) {
                skipped++;
                continue;
            }

            if (!dryRun) {
                await ctx.runMutation(components.resources.mutations.update, {
                    id: r._id,
                    ...promoted,
                });
            }
            migrated++;
        }

        return { migrated, skipped, dryRun: !!dryRun };
    },
});

/**
 * Backfill existing resources for filtering/map compatibility.
 *
 * - Normalizes location to { lat, lng } (supports legacy latitude/longitude)
 * - Promotes missing location fields from metadata/address fields
 * - Promotes amenities from metadata.amenities to top-level amenities
 *
 * Usage:
 * npx convex run migrations/promoteResourceMetadata:backfillResourceLocationAndAmenities '{"dryRun":true}'
 * npx convex run migrations/promoteResourceMetadata:backfillResourceLocationAndAmenities '{}'
 */
export const backfillResourceLocationAndAmenities = mutation({
    args: {
        tenantId: v.optional(v.string()),
        dryRun: v.optional(v.boolean()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, dryRun, limit = 1000 }) => {
        const resources = tenantId
            ? await ctx.runQuery(components.resources.queries.listAll, {
                tenantId,
                limit,
            }).catch(() => [])
            : await ctx.runQuery(components.resources.queries.scanAll, {
                limit,
            }).catch(() => []);

        let scanned = 0;
        let updated = 0;
        let locationUpdated = 0;
        let amenitiesUpdated = 0;
        let cityInferred = 0;

        // Build city centroids from resources that already have city + coordinates.
        const cityPoints: Record<string, Array<{ lat: number; lng: number }>> = {};
        for (const r of resources as any[]) {
            const currentLocation = (r.location ?? {}) as Record<string, unknown>;
            const meta = (r.metadata ?? {}) as Record<string, unknown>;
            const metaLoc = (meta.location ?? {}) as Record<string, unknown>;
            const coords = (meta.coordinates ?? {}) as Record<string, unknown>;
            const city =
                (currentLocation.city as string | undefined) ??
                (metaLoc.city as string | undefined) ??
                (meta.city as string | undefined);
            const lat = toNumber(
                currentLocation.lat ??
                    currentLocation.latitude ??
                    metaLoc.lat ??
                    metaLoc.latitude ??
                    coords.lat ??
                    meta.latitude
            );
            const lng = toNumber(
                currentLocation.lng ??
                    currentLocation.longitude ??
                    metaLoc.lng ??
                    metaLoc.longitude ??
                    coords.lng ??
                    meta.longitude
            );
            if (!city || lat == null || lng == null) continue;
            if (!cityPoints[city]) cityPoints[city] = [];
            cityPoints[city].push({ lat, lng });
        }

        const cityCentroids: Array<{ city: string; lat: number; lng: number }> = Object.entries(cityPoints).map(
            ([city, points]) => {
                const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
                const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
                return { city, lat, lng };
            }
        );

        for (const r of resources as any[]) {
            scanned++;
            const meta = (r.metadata ?? {}) as Record<string, unknown>;

            const normalizedLocation = normalizeLocation(
                (r.location ?? undefined) as Record<string, unknown> | undefined,
                meta
            );
            const normalizedWithNearestCity = normalizedLocation
                ? ({ ...normalizedLocation } as Record<string, unknown>)
                : undefined;

            // If city is still missing but we have coordinates, infer nearest known city.
            if (
                normalizedWithNearestCity &&
                !normalizedWithNearestCity.city &&
                cityCentroids.length > 0
            ) {
                const lat = toNumber(normalizedWithNearestCity.lat);
                const lng = toNumber(normalizedWithNearestCity.lng);
                if (lat != null && lng != null) {
                    let bestCity: string | undefined;
                    let bestDistance = Number.POSITIVE_INFINITY;
                    for (const c of cityCentroids) {
                        const d = haversineKm(lat, lng, c.lat, c.lng);
                        if (d < bestDistance) {
                            bestDistance = d;
                            bestCity = c.city;
                        }
                    }
                    if (bestCity) {
                        normalizedWithNearestCity.city = bestCity;
                    }
                }
            }

            const metadataAmenities = Array.isArray(meta.amenities) ? (meta.amenities as unknown[]) : [];
            const normalizedAmenities = metadataAmenities
                .filter((a) => typeof a === "string")
                .map((a) => String(a));

            const shouldPatchLocation = !locationEquals(
                (r.location ?? undefined) as Record<string, unknown> | undefined,
                normalizedWithNearestCity
            );
            const shouldPatchAmenities =
                (!Array.isArray(r.amenities) || r.amenities.length === 0) &&
                normalizedAmenities.length > 0;

            if (!shouldPatchLocation && !shouldPatchAmenities) continue;

            const patch: Record<string, unknown> = {};
            const prevLocation = (r.location ?? undefined) as Record<string, unknown> | undefined;
            if (shouldPatchLocation && normalizedWithNearestCity) {
                patch.location = normalizedWithNearestCity;
                locationUpdated++;
                if (
                    !prevLocation?.city &&
                    typeof normalizedWithNearestCity.city === "string" &&
                    normalizedWithNearestCity.city.length > 0
                ) {
                    cityInferred++;
                }
            }
            if (shouldPatchAmenities) {
                patch.amenities = normalizedAmenities;
                amenitiesUpdated++;
            }

            if (!dryRun) {
                await ctx.runMutation(components.resources.mutations.update, {
                    id: r._id,
                    ...patch,
                });
            }
            updated++;
        }

        return {
            scanned,
            updated,
            locationUpdated,
            amenitiesUpdated,
            cityInferred,
            dryRun: !!dryRun,
            tenantId: tenantId ?? "ALL",
        };
    },
});

/** Delete all resources for a given tenant (cleanup orphaned data). */
export const cleanupTenantResources = mutation({
    args: { tenantId: v.string(), dryRun: v.optional(v.boolean()) },
    handler: async (ctx, { tenantId, dryRun }) => {
        const allResources = await ctx.runQuery(components.resources.queries.listAll, {
            tenantId,
            limit: 500,
        }).catch(() => []);

        let deleted = 0;
        for (const r of allResources as any[]) {
            if (!dryRun) {
                await ctx.runMutation(components.resources.mutations.hardDelete, {
                    id: r._id,
                });
            }
            deleted++;
        }

        return { deleted, dryRun: !!dryRun };
    },
});

/** Delete ALL resources except those belonging to the keep tenant. */
export const cleanupAllExcept = mutation({
    args: { keepTenantId: v.string(), dryRun: v.optional(v.boolean()) },
    handler: async (ctx, { keepTenantId, dryRun }) => {
        // Scan ALL resources in the component table
        const allResources = await ctx.runQuery(components.resources.queries.scanAll, {
            limit: 1000,
        }).catch(() => []);

        const orphanedByTenant: Record<string, number> = {};
        let deleted = 0;
        let kept = 0;

        for (const r of allResources as any[]) {
            if (r.tenantId === keepTenantId) {
                kept++;
                continue;
            }
            orphanedByTenant[r.tenantId] = (orphanedByTenant[r.tenantId] || 0) + 1;
            if (!dryRun) {
                await ctx.runMutation(components.resources.mutations.hardDelete, {
                    id: r._id,
                });
            }
            deleted++;
        }

        return { deleted, kept, orphanedByTenant, dryRun: !!dryRun };
    },
});
