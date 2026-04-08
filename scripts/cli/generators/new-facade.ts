/**
 * Generator: xala new facade <name>
 *
 * Creates a domain facade that delegates to a Convex component.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, confirm } from '../lib/prompts';
import { toPascal, toKebab, singularize } from '../lib/naming';
import { ROOT_DIR } from '../lib/constants';

export async function newFacade(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New Domain Facade');

  const name = toKebab(args[0] || (await ask('Facade name (kebab-case, matches component name)')));
  const componentName = await ask('Component to delegate to', name);
  const hasAudit = await confirm('Include audit logging?');
  const hasEvents = await confirm('Include event bus emissions?');

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);
  const pascal = toPascal(name);
  const singular = singularize(name);

  const auditImport = hasAudit
    ? `\nimport { createAuditEntry } from "../lib/auditHelpers";`
    : '';
  const eventImport = hasEvents
    ? `\nimport { emitOutboxEvent } from "../lib/eventBus";`
    : '';

  const auditBlock = hasAudit ? `
        // Audit
        await createAuditEntry(ctx, {
            tenantId: args.tenantId as string,
            entityType: "${name}",
            entityId: result.id,
            action: "created",
            actorId: args.tenantId as string, // TODO: pass real userId
        });` : '';

  const eventBlock = hasEvents ? `
        // Event bus
        await emitOutboxEvent(ctx, {
            tenantId: args.tenantId as string,
            topic: "${name}.${singular}.created",
            sourceComponent: "${name}",
            payload: { id: result.id },
        });` : '';

  writer.create(`convex/domain/${name}.ts`, `/**
 * ${pascal} Facade
 *
 * Thin facade that delegates to the ${name} component.
 * Preserves the api.domain.${name}.* paths for SDK compatibility.
 *
 * Responsibilities:
 *   - ID type conversion (typed Id<"tenants"> -> string for component)
 *   - Data enrichment (join user/resource data from core tables)
 *   - Audit logging via audit component
 *   - Event bus emissions
 */

import { mutation, query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";${auditImport}${eventImport}

// =============================================================================
// QUERY FACADES
// =============================================================================

export const list = query({
    args: {
        tenantId: v.id("tenants"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, limit }) => {
        const data = await ctx.runQuery(components.${componentName}.functions.list, {
            tenantId: tenantId as string,
            limit,
        });
        // TODO: Enrich with core table data (user names, resource names)
        return data;
    },
});

export const get = query({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runQuery(components.${componentName}.functions.get, { id });
    },
});

// =============================================================================
// MUTATION FACADES
// =============================================================================

export const create = mutation({
    args: {
        tenantId: v.id("tenants"),
        // TODO: Add domain-specific args
    },
    handler: async (ctx, args) => {
        const result = await ctx.runMutation(components.${componentName}.functions.create, {
            tenantId: args.tenantId as string,
        });${auditBlock}${eventBlock}

        return result;
    },
});

export const update = mutation({
    args: {
        id: v.string(),
        // TODO: Add updatable fields
    },
    handler: async (ctx, { id, ...updates }) => {
        return ctx.runMutation(components.${componentName}.functions.update, { id, ...updates });
    },
});

export const remove = mutation({
    args: { id: v.string() },
    handler: async (ctx, { id }) => {
        return ctx.runMutation(components.${componentName}.functions.remove, { id });
    },
});
`);

  await writer.execute();
  writer.printSummary();

  printManualStep('The facade is ready. Next steps:', [
    `1. Create SDK hooks: pnpm xala new hook ${name}`,
    `2. Add navigation: pnpm xala new nav-item backoffice <section> ${name}`,
    `3. Create a page: pnpm xala new route backoffice ${name} list`,
  ].join('\n'));

  printSuccess(`Domain facade "${name}" created at convex/domain/${name}.ts`);
}
