# DigilistSaaS Convex Backend

Plug-and-play component architecture with 17 isolated Convex components.

## Structure

```
convex/
  convex.config.ts          — App config, registers all 17 components
  schema.ts                 — Core tables (tenants, users, resources, event bus, registry)
  types.ts                  — Status enums and document types

  domain/                   — Facade functions (SDK-facing API)
    resources.ts            — Direct (core table, not a component)
    search.ts               — Direct (reads core resources)
    reviews.ts              — Facade → components.reviews
    notifications.ts        — Facade → components.notifications
    favorites.ts            — Facade → components.userPrefs
    messaging.ts            — Facade → components.messaging
    categories.ts           — Facade → components.catalog
    amenities.ts            — Facade → components.catalog
    bookings.ts             — Direct (pre-migration)
    pricing.ts              — Direct (pre-migration)
    billing.ts              — Direct (pre-migration)
    ...

  components/               — 17 isolated Convex components
    audit/                  — General-purpose audit log
    reviews/                — Reviews with moderation
    notifications/          — Notification feed + preferences
    user-prefs/             — Favorites + saved filters
    messaging/              — Conversations + messages
    catalog/                — Categories + amenities
    analytics/              — Metrics + reporting
    bookings/               — Booking engine
    pricing/                — Pricing engine (9 tables)
    addons/                 — Booking addons
    seasons/                — Seasonal management
    auth/                   — Sessions + tokens
    rbac/                   — Roles + permissions
    billing/                — Payments + invoices
    compliance/             — GDPR (consent, DSAR, policies)
    tenant-config/          — Feature flags + branding
    integrations/           — External service integrations

  lib/                      — Platform infrastructure
    eventBus.ts             — Outbox pattern event bus
    componentContract.ts    — Component API contracts
    componentMiddleware.ts  — Middleware chain + hasModuleEnabled
    rateLimits.ts           — Rate limiting definitions
    convex_lib.ts           — convex-helpers re-exports
    triggers.ts             — Database triggers with event emission
    functions.ts            — Tenant-aware function builders
    rls.ts                  — Row-level security rules
    crud.ts                 — Auto-generated CRUD
    validators.ts           — Validator utilities

  migrations/               — Data migration scripts
    index.ts                — Migration runner + per-domain migrations

  seeds.ts                  — Core table seed data
  seedComponents.ts         — Component table seed data
  seedsV3.ts / seedsFull.ts — Extended seed variants
```

## Commands

```bash
# Deploy (generates _generated/ for all components)
npx convex dev --once

# Seed data
npx convex run seeds:seedAll
npx convex run seedComponents:seedAll

# Run component functions directly
npx convex run --component audit functions:listForTenant '{"tenantId":"..."}'
npx convex run --component reviews functions:list '{"tenantId":"..."}'

# Migrations
npx convex run migrations/index:getMigrationStatus
npx convex run migrations/index:migrateTenantEnabledCategories  # Normalize ARRANGEMENT→ARRANGEMENTER, TORG→TORGET
npx convex run migrations/index:migrateCategories
npx convex run migrations/index:migrateResources
```

## Adding a New Component

See `docs/COMPONENT_ARCHITECTURE.md` for full guide.
