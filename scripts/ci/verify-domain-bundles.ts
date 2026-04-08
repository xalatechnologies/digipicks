/**
 * Domain Bundle CI Gate
 *
 * Verifies that all discovered modules have complete bundles:
 * - Contract test
 * - E2E test
 *
 * Run: npx tsx scripts/ci/verify-domain-bundles.ts
 */

import fs from 'node:fs';
import path from 'node:path';

interface Failure {
    rule: string;
    message: string;
}

function exists(p: string): boolean {
    return fs.existsSync(p);
}

function listDirs(p: string): string[] {
    if (!exists(p)) return [];
    return fs.readdirSync(p).filter((n) => {
        try {
            return fs.statSync(path.join(p, n)).isDirectory();
        } catch {
            return false;
        }
    });
}

function listFiles(p: string): string[] {
    if (!exists(p)) return [];
    return fs.readdirSync(p).filter((n) => {
        try {
            return fs.statSync(path.join(p, n)).isFile();
        } catch {
            return false;
        }
    });
}

// Modules that are part of the kernel and don't need domain bundles
const KERNEL_MODULES = new Set([
    'ops', 'auth', 'rbac', 'billing', 'flags', 'invite',
    'webhooks', 'vipps', 'stripe', 'tenant', 'tenants', 'modules'
]);

const repoRoot = process.cwd();
const convexDir = path.join(repoRoot, 'convex');
const contractsDir = path.join(repoRoot, 'tests', 'contracts');
const e2eDir = path.join(repoRoot, 'tests', 'e2e');

const failures: Failure[] = [];

console.log('Discovering modules from Convex functions...\n');

// Discover modules from Convex function directories
const convexDirs = listDirs(convexDir);
const moduleFromFunctions = new Set<string>();

for (const d of convexDirs) {
    // Skip internal/generated directories
    if (d.startsWith('_') || d === 'node_modules') continue;

    if (!KERNEL_MODULES.has(d)) {
        moduleFromFunctions.add(d);
    }
}

const modules = moduleFromFunctions;

console.log(`Discovered ${modules.size} domain module(s): ${[...modules].join(', ')}\n`);

// Validate each module has required files
for (const mod of modules) {
    console.log(`\n  Checking module: ${mod}`);

    // Contract test must exist (at least one)
    const contractFiles = listFiles(contractsDir);
    const hasContract = contractFiles.some(
        (f) => f.startsWith(`${mod}_`) && f.endsWith('.test.ts')
    );

    if (!hasContract) {
        failures.push({
            rule: 'contract-test',
            message: `Missing contract test: tests/contracts/${mod}_*.test.ts`,
        });
        console.log(`    Missing contract test`);
    } else {
        console.log(`    Contract test found`);
    }

    // E2E must exist (at least one)
    const e2eFiles = listFiles(e2eDir);
    const hasE2E = e2eFiles.some(
        (f) =>
            f.startsWith(`${mod}_`) &&
            (f.endsWith('.spec.ts') || f.endsWith('.test.ts'))
    );

    if (!hasE2E) {
        failures.push({
            rule: 'e2e-test',
            message: `Missing E2E spec: tests/e2e/${mod}_*.spec.ts`,
        });
        console.log(`    Missing E2E test`);
    } else {
        console.log(`    E2E test found`);
    }
}

// Summary
console.log('\n===============================================================\n');

if (failures.length > 0) {
    console.error('Domain bundle CI gate FAILED:\n');
    for (const f of failures) {
        console.error(`  [${f.rule}] ${f.message}`);
    }
    console.log('\nPlease add the missing test files before merging.\n');
    process.exit(1);
} else {
    console.log('Domain bundle CI gate PASSED\n');
    console.log('All discovered modules have complete verification bundles.\n');
    process.exit(0);
}
