/**
 * Addons Hooks
 *
 * CRUD and association hooks for add-ons (resource and booking addons).
 */

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { useMutationAdapter } from "./utils";

// =============================================================================
// Types
// =============================================================================

export interface Addon {
    _id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    priceType: string;
    price: number;
    currency: string;
    maxQuantity?: number;
    requiresApproval: boolean;
    leadTimeHours?: number;
    icon?: string;
    images: unknown[];
    displayOrder: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
}

export interface ResourceAddon {
    _id: string;
    tenantId: string;
    resourceId: string;
    addonId: string;
    isRequired: boolean;
    isRecommended: boolean;
    customPrice?: number;
    displayOrder: number;
    isActive: boolean;
    addon: Addon | null;
    effectivePrice: number;
}

export interface BookingAddon {
    _id: string;
    tenantId: string;
    bookingId: string;
    addonId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    status: "pending" | "confirmed" | "approved" | "rejected" | "cancelled";
    addon: Addon | null;
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * List addons for a tenant, optionally filtered by category or active status.
 */
export function useAddons(
    tenantId: string | undefined,
    options?: { category?: string; isActive?: boolean }
) {
    const data = useQuery(
        api.domain.addons.list,
        tenantId
            ? {
                  tenantId: tenantId as Id<"tenants">,
                  category: options?.category,
                  isActive: options?.isActive,
              }
            : "skip"
    );

    return {
        data: { data: (data ?? []) as Addon[] },
        isLoading: tenantId !== undefined && data === undefined,
        error: null,
    };
}

/**
 * Get a single addon by ID.
 */
export function useAddon(addonId: string | undefined) {
    const data = useQuery(
        api.domain.addons.get,
        addonId ? { id: addonId } : "skip"
    );

    return {
        data: data as Addon | null | undefined,
        isLoading: addonId !== undefined && data === undefined,
        error: null,
    };
}

/**
 * List addons available for a specific resource.
 */
export function useAddonsForResource(resourceId: string | undefined) {
    const data = useQuery(
        api.domain.addons.listForResource,
        resourceId ? { resourceId } : "skip"
    );

    return {
        data: { data: (data ?? []) as ResourceAddon[] },
        isLoading: resourceId !== undefined && data === undefined,
        error: null,
    };
}

/**
 * List addons selected for a specific booking.
 */
export function useAddonsForBooking(bookingId: string | undefined) {
    const data = useQuery(
        api.domain.addons.listForBooking,
        bookingId ? { bookingId } : "skip"
    );

    return {
        data: { data: (data ?? []) as BookingAddon[] },
        isLoading: bookingId !== undefined && data === undefined,
        error: null,
    };
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Create a new addon.
 */
export function useCreateAddon() {
    const convexMutation = useMutation(api.domain.addons.create);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
    const fn = useCallback(async (args: any) => convexMutation(args), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Update an existing addon.
 */
export function useUpdateAddon() {
    const convexMutation = useMutation(api.domain.addons.update);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
    const fn = useCallback(async (args: any) => convexMutation(args), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Delete an addon.
 */
export function useDeleteAddon() {
    const convexMutation = useMutation(api.domain.addons.remove);
    const fn = useCallback(async (id: string) => convexMutation({ id }), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Add an addon to a resource.
 */
export function useAddAddonToResource() {
    const convexMutation = useMutation(api.domain.addons.addToResource);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
    const fn = useCallback(async (args: any) => convexMutation(args), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Remove an addon from a resource.
 */
export function useRemoveAddonFromResource() {
    const convexMutation = useMutation(api.domain.addons.removeFromResource);
    const fn = useCallback(async (resourceId: string, addonId: string) => convexMutation({ resourceId, addonId }), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Add an addon to a booking.
 */
export function useAddAddonToBooking() {
    const convexMutation = useMutation(api.domain.addons.addToBooking);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
    const fn = useCallback(async (args: any) => convexMutation(args), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Update a booking addon (quantity, notes).
 */
export function useUpdateBookingAddon() {
    const convexMutation = useMutation(api.domain.addons.updateBookingAddon);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
    const fn = useCallback(async (args: any) => convexMutation(args), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Remove an addon from a booking.
 */
export function useRemoveAddonFromBooking() {
    const convexMutation = useMutation(api.domain.addons.removeFromBooking);
    const fn = useCallback(async (id: string) => convexMutation({ id }), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Approve a pending booking addon.
 */
export function useApproveBookingAddon() {
    const convexMutation = useMutation(api.domain.addons.approveBookingAddon);
    const fn = useCallback(async (id: string) => convexMutation({ id }), [convexMutation]);
    return useMutationAdapter(fn);
}

/**
 * Reject a pending booking addon.
 */
export function useRejectBookingAddon() {
    const convexMutation = useMutation(api.domain.addons.rejectBookingAddon);
    const fn = useCallback(async (id: string) => convexMutation({ id }), [convexMutation]);
    return useMutationAdapter(fn);
}

// =============================================================================
// Convenience Hooks
// =============================================================================
