
/**
 * Root-level convex-test module setup.
 *
 * Globs ALL TypeScript files from the convex root directory so convex-test
 * can discover the _generated/api.ts registry alongside any lib/, schema.ts,
 * or crons.ts files.
 *
 * Used by tests that exercise root-level internal functions (e.g. lib/eventBus.ts)
 * which are registered under paths like "lib/eventBus" relative to the convex root.
 *
 * Usage in root-level or lib/ tests:
 *   import { modules } from "../testSetup";   // from lib/
 *   import { modules } from "./testSetup";    // from convex root
 *   const t = convexTest(schema, modules);
 */
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
