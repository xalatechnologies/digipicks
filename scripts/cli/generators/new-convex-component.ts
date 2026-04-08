/**
 * Generator: xala new convex-component <name>
 *
 * Creates a full Convex component with schema, functions, and contract.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, choose } from '../lib/prompts';
import { toPascal, toKebab } from '../lib/naming';
import { COMPONENT_CATEGORIES, ROOT_DIR } from '../lib/constants';

export async function newConvexComponent(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New Convex Component');

  const name = toKebab(args[0] || (await ask('Component name (kebab-case, e.g. "waitlists")')));
  const category = await choose('Component category?', [...COMPONENT_CATEGORIES]);
  const tablesInput = await ask('Table names (comma-separated, e.g. "waitlists,waitlistEntries")', name);
  const tables = tablesInput.split(',').map((t) => t.trim()).filter(Boolean);
  const depsInput = await ask('Core table dependencies (comma-separated, or empty)', 'tenants,users');
  const deps = depsInput ? depsInput.split(',').map((d) => d.trim()).filter(Boolean) : [];
  const eventsInput = await ask('Event topics to emit (comma-separated, or empty)', `${name}.created,${name}.updated,${name}.deleted`);
  const events = eventsInput ? eventsInput.split(',').map((e) => e.trim()).filter(Boolean) : [];

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);
  const pascal = toPascal(name);
  const base = `convex/components/${name}`;

  // 1. convex.config.ts
  writer.create(`${base}/convex.config.ts`, `import { defineComponent } from "convex/server";

const component = defineComponent("${name}");
export default component;
`);

  // 2. schema.ts
  const tableSchemas = tables.map((table) => {
    const tablePascal = toPascal(table);
    return `    ${table}: defineTable({
        tenantId: v.string(),
        // TODO: Add ${tablePascal} fields
        status: v.string(),
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"]),`;
  });

  writer.create(`${base}/schema.ts`, `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
${tableSchemas.join('\n\n')}
});
`);

  // 3. functions.ts
  const primaryTable = tables[0];
  writer.create(`${base}/functions.ts`, `import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// QUERIES
// =============================================================================

export const list = query({
    args: {
        tenantId: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(v.any()),
    handler: async (ctx, { tenantId, limit }) => {
        let results = await ctx.db
            .query("${primaryTable}")
            .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
            .collect();
        results.sort((a, b) => b._creationTime - a._creationTime);
        if (limit) results = results.slice(0, limit);
        return results;
    },
});

export const get = query({
    args: { id: v.id("${primaryTable}") },
    returns: v.any(),
    handler: async (ctx, { id }) => {
        const doc = await ctx.db.get(id);
        if (!doc) throw new Error("${pascal} not found");
        return doc;
    },
});

// =============================================================================
// MUTATIONS
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.string(),
        // TODO: Add creation fields
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("${primaryTable}", {
            ...args,
            status: "active",
        });
        return { id: id as string };
    },
});

export const update = mutation({
    args: {
        id: v.id("${primaryTable}"),
        // TODO: Add updatable fields
    },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id, ...updates }) => {
        const doc = await ctx.db.get(id);
        if (!doc) throw new Error("${pascal} not found");
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([_, val]) => val !== undefined),
        );
        await ctx.db.patch(id, filtered);
        return { success: true };
    },
});

export const remove = mutation({
    args: { id: v.id("${primaryTable}") },
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx, { id }) => {
        const doc = await ctx.db.get(id);
        if (!doc) throw new Error("${pascal} not found");
        await ctx.db.delete(id);
        return { success: true };
    },
});

// =============================================================================
// IMPORT (for migrations/seeding)
// =============================================================================

export const importRecord = mutation({
    args: {
        tenantId: v.string(),
        // TODO: Add all fields for migration
    },
    returns: v.object({ id: v.string() }),
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("${primaryTable}", args);
        return { id: id as string };
    },
});
`);

  // 4. contract.ts
  const emitsStr = events.map((e) => `"${e}"`).join(', ');
  const depsStr = deps.map((d) => `"${d}"`).join(', ');

  writer.create(`${base}/contract.ts`, `import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "${name}",
    version: "1.0.0",
    category: "${category}",
    description: "${pascal} management",
    queries: {
        list: {
            args: { tenantId: v.string(), limit: v.optional(v.number()) },
            returns: v.array(v.any()),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
    },
    mutations: {
        create: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        update: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        remove: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
    },
    emits: [${emitsStr}],
    subscribes: [],
    dependencies: {
        core: [${depsStr}],
        components: [],
    },
});
`);

  // 5. testSetup.test-util.ts
  writer.create(`${base}/testSetup.test-util.ts`, `export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
`);

  await writer.execute();
  writer.printSummary();

  // Manual steps
  printManualStep('Register component in convex/convex.config.ts:', [
    `import ${name} from "./components/${name}/convex.config";`,
    `app.use(${name});`,
  ].join('\n'));

  printManualStep('Generate component types:', 'npx convex dev');

  printSuccess(`Convex component "${name}" scaffolded.`);
}
