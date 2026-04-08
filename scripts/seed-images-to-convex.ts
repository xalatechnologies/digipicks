#!/usr/bin/env npx tsx
/**
 * Upload seed images to Convex storage and assign to resources.
 *
 * Usage: npx tsx scripts/seed-images-to-convex.ts
 *
 * Reads images from public/seed-images/, uploads them to Convex file storage,
 * and patches each resource document with the CDN URLs.
 */

import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONVEX_URL = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
    console.error("Set VITE_CONVEX_URL or CONVEX_URL in your .env");
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);
const SEED_DIR = path.resolve(__dirname, "../public/seed-images");

// Map category folder names to Convex categoryKey values
const folderToCategoryKey: Record<string, string[]> = {
    "Bibliotek": ["LOKALER"],
    "Grendehus og sammfunnshus": ["LOKALER"],
    "Gymsal": ["SPORT"],
    "Idrettshaller": ["SPORT"],
    "Kulturhus": ["LOKALER", "ARRANGEMENT"],
    "lokaler-og-baner": ["LOKALER", "SPORT"],
    "møterom": ["LOKALER"],
    "Møterom og kursrom": ["LOKALER"],
    "Selskapslokaler": ["LOKALER"],
    "Svømmehall": ["SPORT"],
    "utstyr": ["SPORT", "TORG"],
    "arrangement": ["ARRANGEMENT", "TORG"],
};

// Subcategory hints for better matching
const folderToSubcategory: Record<string, string[]> = {
    "Bibliotek": ["BIBLIOTEK"],
    "Grendehus og sammfunnshus": ["GRENDEHUS", "SAMFUNNSHUS", "BYGDEHUS", "MENIGHETSHUS"],
    "Gymsal": ["IDRETTSHALL", "TRENINGSLOKALE", "GYMSAL"],
    "Idrettshaller": ["IDRETTSHALL", "FOTBALLBANE", "KUNSTGRESS", "IDRETTSPARK", "ISHALL"],
    "Kulturhus": ["KULTURHUS", "TEATER", "KONSERTSAL", "KONSERTARENA"],
    "lokaler-og-baner": ["FOTBALLBANE", "KUNSTGRESS", "IDRETTSPARK"],
    "møterom": ["MOTEROM"],
    "Møterom og kursrom": ["MOTEROM", "KURSLOKALE", "KONFERANSEROM"],
    "Selskapslokaler": ["FESTLOKALE", "SELSKAPSLOKALE"],
    "Svømmehall": ["SVOMMEHALL", "VANNAKTIVITETER"],
    "utstyr": [],
    "arrangement": ["SCENE", "KONSERT", "FESTIVAL", "FESTIVALPLASS"],
};

interface ConvexResource {
    _id: string;
    name: string;
    categoryKey: string;
    subcategoryKeys?: string[];
    images?: Array<{ url: string; alt: string; isPrimary: boolean; storageId?: string }>;
}

function getImagesFromFolder(folder: string): string[] {
    const dir = path.join(SEED_DIR, folder);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map(f => path.join(dir, f));
}

function matchResourceToFolder(resource: ConvexResource): string | null {
    const subcats = resource.subcategoryKeys ?? [];

    // Try subcategory matching first (most specific)
    for (const [folder, folderSubcats] of Object.entries(folderToSubcategory)) {
        for (const subcat of subcats) {
            if (folderSubcats.includes(subcat)) return folder;
        }
    }

    // Fall back to name-based heuristics
    const nameLower = resource.name.toLowerCase();
    if (nameLower.includes("bibliotek")) return "Bibliotek";
    if (nameLower.includes("grendehus") || nameLower.includes("bygdehus") || nameLower.includes("samfunnshus") || nameLower.includes("menighetshus")) return "Grendehus og sammfunnshus";
    if (nameLower.includes("svømmehall") || nameLower.includes("svommehall") || nameLower.includes("basseng")) return "Svømmehall";
    if (nameLower.includes("kulturhus") || nameLower.includes("scene") || nameLower.includes("kulturarena")) return "Kulturhus";
    if (nameLower.includes("idrettshall") || nameLower.includes("ishall")) return "Idrettshaller";
    if (nameLower.includes("idrettspark") || nameLower.includes("kunstgress") || nameLower.includes("fotball") || nameLower.includes("bane")) return "lokaler-og-baner";
    if (nameLower.includes("møterom") || nameLower.includes("moterom") || nameLower.includes("kursrom") || nameLower.includes("konferanserom")) return "Møterom og kursrom";
    if (nameLower.includes("festlokale") || nameLower.includes("selskapslokale")) return "Selskapslokaler";
    if (nameLower.includes("gymsal") || nameLower.includes("aktivitetshus") || nameLower.includes("treningssenter")) return "Gymsal";
    if (nameLower.includes("torg") || nameLower.includes("marked") || nameLower.includes("festplass") || nameLower.includes("brygge")) return "arrangement";
    if (nameLower.includes("øvingslokale") || nameLower.includes("ovingslokale") || nameLower.includes("musikklokale")) return "Kulturhus";
    if (nameLower.includes("skatepark") || nameLower.includes("aktivitetsomr")) return "lokaler-og-baner";

    // Fall back to categoryKey-based matching
    for (const [folder, cats] of Object.entries(folderToCategoryKey)) {
        if (cats.includes(resource.categoryKey)) return folder;
    }

    return null;
}

async function uploadFile(filePath: string): Promise<{ storageId: string; url: string } | null> {
    try {
        // Generate upload URL
        const uploadUrl: string = await client.mutation("storage:generateUploadUrl" as any, {});

        // Read file and upload
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

        const resp = await fetch(uploadUrl, {
            method: "POST",
            body: fileBuffer,
            headers: { "Content-Type": contentType },
        });

        if (!resp.ok) {
            console.error(`  Upload failed for ${path.basename(filePath)}: ${resp.status}`);
            return null;
        }

        const { storageId } = await resp.json();

        // Get the public URL
        const url: string | null = await client.query("storage:getFileUrl" as any, { storageId });
        if (!url) {
            console.error(`  Could not get URL for ${storageId}`);
            return null;
        }

        return { storageId, url };
    } catch (err) {
        console.error(`  Error uploading ${path.basename(filePath)}:`, err);
        return null;
    }
}

async function main() {
    console.log("Fetching resources from Convex...");
    const resources: ConvexResource[] = await client.query("domain/resources:listPublic" as any, {});
    console.log(`Found ${resources.length} published resources`);

    // Build a pool of images per folder (shuffled for variety)
    const folderImagePools: Record<string, string[]> = {};
    const folderIndexes: Record<string, number> = {};

    for (const folder of Object.keys(folderToCategoryKey)) {
        const images = getImagesFromFolder(folder);
        // Simple shuffle
        for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [images[i], images[j]] = [images[j], images[i]];
        }
        folderImagePools[folder] = images;
        folderIndexes[folder] = 0;
        console.log(`  ${folder}: ${images.length} images`);
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const resource of resources) {
        // Skip resources that already have Convex storage images
        const existingImages = resource.images ?? [];
        const hasStorageImages = existingImages.some(img => img.storageId || img.url?.includes("convex.cloud"));
        if (hasStorageImages) {
            console.log(`✓ ${resource.name} — already has Convex storage images`);
            skipped++;
            continue;
        }

        const folder = matchResourceToFolder(resource);
        if (!folder) {
            console.log(`? ${resource.name} — no matching image folder`);
            skipped++;
            continue;
        }

        const pool = folderImagePools[folder] ?? [];
        if (pool.length === 0) {
            console.log(`? ${resource.name} — folder "${folder}" has no images`);
            skipped++;
            continue;
        }

        // Pick 1-3 images from the pool (round-robin)
        const numImages = Math.min(1 + Math.floor(Math.random() * 2), pool.length);
        const selectedFiles: string[] = [];
        for (let i = 0; i < numImages; i++) {
            const idx = folderIndexes[folder] % pool.length;
            selectedFiles.push(pool[idx]);
            folderIndexes[folder] = idx + 1;
        }

        console.log(`↑ ${resource.name} (${folder}) — uploading ${selectedFiles.length} image(s)...`);

        const newImages: Array<{ url: string; alt: string; isPrimary: boolean; storageId: string }> = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const result = await uploadFile(selectedFiles[i]);
            if (result) {
                newImages.push({
                    url: result.url,
                    alt: `${resource.name} — bilde ${i + 1}`,
                    isPrimary: i === 0,
                    storageId: result.storageId,
                });
                uploaded++;
            } else {
                failed++;
            }
        }

        if (newImages.length > 0) {
            // Patch the resource with new images
            try {
                await client.mutation("domain/resources:update" as any, {
                    id: resource._id,
                    images: newImages,
                });
                console.log(`  ✓ Updated ${resource.name} with ${newImages.length} images`);
            } catch (err) {
                console.error(`  ✗ Failed to update ${resource.name}:`, err);
                failed++;
            }
        }
    }

    console.log(`\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(console.error);
