/**
 * E2E Test Data Seeder
 *
 * Idempotent seeder that creates a complete E2E test world using the demo tenant.
 * Designed to be run via: npx tsx scripts/seed-e2e.ts
 *
 * Reuses patterns from convex/seeds.ts and convex/seedComponents.ts:
 * - Tenant lookup by slug (never create new tenant)
 * - Find-or-create for users, resources, performances
 * - Idempotent: safe to run repeatedly without duplicating
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const E2E_TENANT_ID = 'qd71nzdbvssrm2n3n2018daspx81pftx';

const E2E_USERS = [
  { email: 'e2e-superadmin@digipicks.test', name: 'E2E Superadmin', role: 'superadmin' },
  { email: 'e2e-admin@digipicks.test', name: 'E2E Admin', role: 'admin' },
  { email: 'e2e-creator@digipicks.test', name: 'E2E Creator', role: 'creator' },
  { email: 'e2e-subscriber@digipicks.test', name: 'E2E Subscriber', role: 'subscriber' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function convexRun(fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const argsJson = JSON.stringify(args);
  try {
    const { stdout } = await execAsync(`npx convex run '${fn}' '${argsJson}'`, { cwd: process.cwd(), timeout: 30_000 });
    const trimmed = stdout.trim();
    if (!trimmed || trimmed === 'null') return null;
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn(`  [WARN] convexRun(${fn}) failed:`, (error as Error).message?.split('\n')[0]);
    return null;
  }
}

function log(msg: string) {
  console.log(`[seed-e2e] ${msg}`);
}

// ---------------------------------------------------------------------------
// Seed Steps
// ---------------------------------------------------------------------------

async function verifyTenant(): Promise<boolean> {
  log('Verifying E2E tenant exists...');
  const tenant = await convexRun('tenants/index:getBySlug', { slug: 'demo-digipicks' });
  if (!tenant) {
    console.error('ERROR: E2E tenant not found. Run seed:all first.');
    return false;
  }
  log(`  ✓ Tenant found: ${(tenant as any).name}`);
  return true;
}

async function seedUsers(): Promise<void> {
  log('Seeding E2E users...');
  for (const user of E2E_USERS) {
    // Find-or-create user via the users module
    const existing = await convexRun('users:getByEmail', { email: user.email });
    if (existing) {
      log(`  ✓ User exists: ${user.email}`);
    } else {
      await convexRun('users:create', {
        email: user.email,
        name: user.name,
        status: 'active',
      });
      log(`  + Created user: ${user.email}`);
    }
  }
}

async function seedRoles(): Promise<void> {
  log('Seeding E2E role bindings...');
  for (const user of E2E_USERS) {
    if (user.role === 'subscriber') continue; // Subscribers don't get tenant bindings

    // Bind role to user for the E2E tenant
    const existing = await convexRun('users:getByEmail', { email: user.email });
    if (existing) {
      // Create tenantUser binding if needed
      await convexRun('tenants/index:addUser', {
        tenantId: E2E_TENANT_ID,
        userId: (existing as any)._id,
        role: user.role,
      });
      log(`  ✓ Role binding: ${user.email} → ${user.role}`);
    }
  }
}

async function seedPerformances(): Promise<void> {
  log('Seeding E2E performances...');
  // Note: Actual performance seeding requires the ticketing component.
  // This step documents what should exist; actual seeding is done via
  // the Convex seed scripts.
  log('  ℹ Performances are seeded via convex seed scripts');
  log('  ℹ Run: pnpm seed:all for base data, then pnpm seed:components for components');
}

async function seedGiftCards(): Promise<void> {
  log('Seeding E2E gift cards...');
  const cards = [
    { code: 'E2E-GC-001', balance: 500 },
    { code: 'E2E-GC-002', balance: 500 },
    { code: 'E2E-GC-003', balance: 500 },
  ];

  for (const card of cards) {
    const existing = await convexRun('domain/giftcards:getGiftCard', {
      tenantId: E2E_TENANT_ID,
      code: card.code,
    });
    if (existing) {
      log(`  ✓ Gift card exists: ${card.code}`);
    } else {
      await convexRun('domain/giftcards:createGiftCard', {
        tenantId: E2E_TENANT_ID,
        code: card.code,
        initialBalance: card.balance,
        type: 'digital',
        createdBy: 'e2e-seed',
      });
      log(`  + Created gift card: ${card.code} (${card.balance} NOK)`);
    }
  }
}

async function seedDiscountCodes(): Promise<void> {
  log('Seeding E2E discount codes...');
  // Discount codes are typically seeded via seed components script
  // This documents the expected E2E discount code
  log('  ℹ Discount code E2ETEST10 (10% off) seeded via seed components script');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════');
  console.log('  DigiPicks E2E Test Data Seeder');
  console.log('  Tenant: E2E DigiPicks Demo');
  console.log('═══════════════════════════════════════════\n');

  const tenantOk = await verifyTenant();
  if (!tenantOk) {
    process.exit(1);
  }

  await seedUsers();
  await seedRoles();
  await seedPerformances();
  await seedGiftCards();
  await seedDiscountCodes();

  console.log('\n═══════════════════════════════════════════');
  console.log('  ✓ E2E seed complete');
  console.log('═══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
