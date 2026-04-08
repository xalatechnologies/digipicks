#!/usr/bin/env tsx
/**
 * SSO Invariants Compliance Check
 *
 * Verifies no app-local auth implementations per docs/SHARED_INFRASTRUCTURE.md §3.
 * Run: npx tsx scripts/check-sso-invariants.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = join(ROOT, 'apps');

const VIOLATIONS: string[] = [];

function* walkTsTsx(dir: string): Generator<string> {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        yield* walkTsTsx(full);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        yield full;
      }
    }
  } catch {
    // skip
  }
}

// Violation: useAuth imported from app-local path (@/hooks, ./hooks, etc.) instead of app-shell
const BAD_IMPORT = /import\s+{[^}]*useAuth[^}]*}\s+from\s+['"](\.\.\/|\.\/|@\/)(hooks|lib|utils|services)/;

for (const appDir of readdirSync(APPS, { withFileTypes: true })) {
  if (!appDir.isDirectory()) continue;
  const appPath = join(APPS, appDir.name);
  for (const file of walkTsTsx(appPath)) {
    const content = readFileSync(file, 'utf-8');
    if (BAD_IMPORT.test(content)) {
      VIOLATIONS.push(`${file}: useAuth from app-local; use @digilist-saas/app-shell for SSO`);
    }
  }
}

if (VIOLATIONS.length > 0) {
  console.error('SSO invariants check failed:\n');
  VIOLATIONS.forEach((v) => console.error('  -', v));
  console.error('\nSee docs/SHARED_INFRASTRUCTURE.md §3');
  process.exit(1);
}

console.log('SSO invariants check passed (no app-local auth)');
