import type { QueryCtx } from "../_generated/server";

/**
 * Batch-fetch documents by IDs. Avoids N+1 query pattern.
 * Returns a Map of id -> document for O(1) lookups.
 */
export async function batchGet(
    ctx: QueryCtx,
    ids: (string | undefined | null)[]
): Promise<Map<string, any>> {
    const uniqueIds = [...new Set(ids.filter(Boolean) as string[])];
    const docs = await Promise.all(uniqueIds.map((id) => ctx.db.get(id as any)));
    const map = new Map<string, any>();
    for (let i = 0; i < uniqueIds.length; i++) {
        if (docs[i]) map.set(uniqueIds[i], docs[i]);
    }
    return map;
}
