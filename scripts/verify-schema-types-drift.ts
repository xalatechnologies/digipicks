#!/usr/bin/env npx tsx
/**
 * Schema ↔ Shared Types Drift Verification
 *
 * Ensures Convex core schema tables have corresponding shared type exports.
 * Run in CI to catch drift. Does NOT validate field-level parity (manual review).
 *
 * Usage: pnpm run verify:schema-types
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Map Convex table names -> expected shared type names (identity & tenancy)
const TABLE_TO_TYPE: Record<string, string> = {
  tenants: 'Tenant',
  users: 'User',
  organizations: 'Organization',
  tenantUsers: 'TenantUser',
};

function extractTableNames(schemaContent: string): string[] {
  // Format: tableName: defineTable({ or ...defineTable("name", {
  const keyMatches = schemaContent.matchAll(/(\w+):\s*defineTable\s*\(/g);
  const argMatches = schemaContent.matchAll(/defineTable\s*\(\s*["'](\w+)["']\s*,/g);
  const names = new Set<string>();
  for (const m of keyMatches) names.add(m[1]);
  for (const m of argMatches) names.add(m[1]);
  return [...names];
}

function extractSharedTypeExports(typesDir: string): Set<string> {
  const exports = new Set<string>();
  const typeFiles = ['common', 'auth', 'tenant'];
  for (const file of typeFiles) {
    try {
      const content = readFileSync(
        join(typesDir, `${file}.ts`),
        'utf-8'
      );
      const ifaceMatches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+(\w+)/g);
      for (const m of ifaceMatches) exports.add(m[1]);
    } catch {
      // File may not exist
    }
  }
  return exports;
}

function main(): void {
  const schemaPath = join(ROOT, 'convex', 'schema.ts');
  let hasErrors = false;

  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const tableNames = extractTableNames(schemaContent);

  // Check core tables exist in schema
  for (const table of Object.keys(TABLE_TO_TYPE)) {
    if (!tableNames.includes(table)) {
      console.error(`❌ Convex schema missing table: ${table}`);
      hasErrors = true;
    }
  }

  const sharedTypesDir = join(ROOT, 'packages', 'shared', 'src', 'types');
  const sharedExports = extractSharedTypeExports(sharedTypesDir);

  for (const [table, typeName] of Object.entries(TABLE_TO_TYPE)) {
    if (!tableNames.includes(table)) continue;
    if (!sharedExports.has(typeName)) {
      console.error(
        `❌ Shared types missing export for Convex table "${table}": expected "${typeName}"`
      );
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\nSchema ↔ shared types drift detected. Update shared types or schema.');
    process.exit(1);
  }

  console.log('✅ Schema ↔ shared types verification passed (core tables align)');
}

main();
