/**
 * Generator: xala new hook <name>
 *
 * Creates SDK hooks for a domain module, wired to Convex backend.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, confirm } from '../lib/prompts';
import { toPascal, toCamel, toKebab, pluralize } from '../lib/naming';
import { ROOT_DIR } from '../lib/constants';

export async function newHook(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New SDK Hook');

  const name = toKebab(args[0] || (await ask('Domain name (kebab-case, e.g. "waitlists")')));
  const facadeName = await ask('Domain facade module name', name);
  const entityName = await ask('Entity name (singular PascalCase, e.g. "Waitlist")', toPascal(name));
  const hasMutations = await confirm('Include mutation hooks?');

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  const pascal = entityName;
  const pascalPlural = toPascal(pluralize(toCamel(entityName)));
  const camel = toCamel(entityName);
  const camelPlural = toCamel(pluralize(entityName));

  // 1. Transform file
  writer.create(`packages/sdk/src/transforms/${name}.ts`, `/**
 * DigilistSaaS SDK - ${pascal} Transforms
 *
 * Maps between the Convex ${name} shape and the SDK ${pascal} shape.
 */

export interface Convex${pascal} {
    _id: string;
    _creationTime: number;
    tenantId: string;
    status: string;
    metadata?: Record<string, unknown>;
    // TODO: Add component-specific fields
}

export interface ${pascal} {
    id: string;
    tenantId: string;
    status: string;
    createdAt: string;
    // TODO: Add transformed fields
}

export function transform${pascal}(raw: Convex${pascal}): ${pascal} {
    return {
        id: raw._id,
        tenantId: raw.tenantId,
        status: raw.status,
        createdAt: new Date(raw._creationTime).toISOString(),
    };
}
`);

  // 2. Hook file
  const mutationSection = hasMutations ? `
// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreate${pascal}() {
    const mutation = useConvexMutation(api.domain.${facadeName}.create);
    return {
        mutate: (input: Create${pascal}Input) => {
            mutation(input as any);
        },
        mutateAsync: async (input: Create${pascal}Input) => {
            return mutation(input as any);
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

export function useUpdate${pascal}() {
    const mutation = useConvexMutation(api.domain.${facadeName}.update);
    return {
        mutate: (input: Update${pascal}Input) => {
            mutation(input as any);
        },
        mutateAsync: async (input: Update${pascal}Input) => {
            return mutation(input as any);
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}

export function useDelete${pascal}() {
    const mutation = useConvexMutation(api.domain.${facadeName}.remove);
    return {
        mutate: (id: string) => {
            mutation({ id } as any);
        },
        mutateAsync: async (id: string) => {
            return mutation({ id } as any);
        },
        isLoading: false,
        error: null,
        isSuccess: false,
    };
}
` : '';

  const mutationTypes = hasMutations ? `
export interface Create${pascal}Input {
    tenantId: string;
    // TODO: Add creation fields
}

export interface Update${pascal}Input {
    id: string;
    // TODO: Add updatable fields
}
` : '';

  const mutationExports = hasMutations
    ? `\nexport { useCreate${pascal}, useUpdate${pascal}, useDelete${pascal} };`
    : '';

  writer.create(`packages/sdk/src/hooks/use-${name}.ts`, `/**
 * DigilistSaaS SDK - ${pascal} Hooks
 *
 * React hooks for ${name} operations, wired to Convex backend.
 * Query hooks return: { data, ${camelPlural}, isLoading, error }
 * Mutation hooks return: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import { transform${pascal} } from "../transforms/${name}";
import type { ${pascal} } from "../transforms/${name}";

// Re-export types
export type { ${pascal} } from "../transforms/${name}";
${mutationTypes}
// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all ${camelPlural} for a tenant.
 */
export function use${pascalPlural}(
    tenantId: string | undefined,
    params?: { limit?: number },
) {
    const data = useConvexQuery(
        api.domain.${facadeName}.list,
        tenantId ? { tenantId: tenantId as any, ...params } : "skip",
    );
    const isLoading = tenantId !== undefined && data === undefined;
    const items: ${pascal}[] = (data ?? []).map(transform${pascal});
    return { data: { data: items }, ${camelPlural}: items, isLoading, error: null };
}

/**
 * Fetch a single ${camel} by ID.
 */
export function use${pascal}(id: string | undefined) {
    const data = useConvexQuery(
        api.domain.${facadeName}.get,
        id ? { id } : "skip",
    );
    const isLoading = id !== undefined && data === undefined;
    const item: ${pascal} | null = data ? transform${pascal}(data) : null;
    return { data: item ? { data: item } : null, ${camel}: item, isLoading, error: null };
}
${mutationSection}`);

  await writer.execute();
  writer.printSummary();

  // Print manual steps
  printManualStep('Add exports to packages/sdk/src/hooks/index.ts:', [
    `export { use${pascalPlural}, use${pascal}${hasMutations ? `, useCreate${pascal}, useUpdate${pascal}, useDelete${pascal}` : ''} } from './use-${name}';`,
    `export type { ${pascal}${hasMutations ? `, Create${pascal}Input, Update${pascal}Input` : ''} } from './use-${name}';`,
  ].join('\n'));

  printSuccess(`SDK hooks created for "${name}".`);
}
