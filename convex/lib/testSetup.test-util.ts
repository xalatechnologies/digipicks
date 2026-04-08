
/**
 * convex-test module setup for the lib/ directory.
 *
 * The lib/ functions use the root convex/_generated directory (not a component-level one).
 * We glob from the parent level to ensure convex-test can discover the root _generated
 * directory alongside all function files.
 *
 * Includes:
 *   - Root _generated/** for function registration
 *   - Root *.ts files (schema.ts, crons.ts, etc.)
 *   - lib/**  for the lib functions under test
 *
 * Usage in tests:
 *   import { modules } from "./testSetup";
 *   const t = convexTest(schema, modules);
 */
export const modules = import.meta.glob("../**/!(*.*.*)*.*s");
