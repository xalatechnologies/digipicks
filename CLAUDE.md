# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Xala Foundation** is a production-grade SaaS platform core built on **Convex** (serverless database + functions). It provides multi-tenant isolation, RBAC, resource management, billing, messaging, classification, compliance, and AI readiness — consumed by 2 React apps through a type-safe SDK.

20 Convex components, 38 domain facades, 51 SDK hooks, 1,488 passing tests, 17/17 SaaS module coverage. OpenAPI REST adapter with Swagger UI. See `docs/architecture/PLATFORM_STATE.md` for the full inventory.

The 2 apps (`web`, `dashboard`) use the `@digipicks/ds` design system (62 components following [Digdir Designsystemet](https://designsystemet.no/no)) and the `@digipicks/sdk` adapter layer backed by Convex.

## Commands

```bash
# Development
pnpm install                          # Install all dependencies (pnpm required, not npm)
npx convex dev                        # Start Convex dev server (watches schema + functions + components)
pnpm dev                              # Alias for npx convex dev

# Build
pnpm sdk:build                        # Build SDK package (tsup)

# Testing
pnpm sdk:test                         # SDK unit tests (vitest, jsdom) — 217 tests
pnpm test:convex                      # Convex function tests (vitest, edge-runtime) — 1,248 tests
pnpm test:convex:watch                # Watch mode
pnpm test:convex:e2e                  # E2E backend tests via custom runner
pnpm test:convex:e2e:all              # All E2E suites
pnpm test:e2e                         # Playwright browser E2E tests
pnpm test:all                         # Full suite: sdk + convex + e2e

# Run a single test file
cd convex && npx vitest --config vitest.config.ts --run path/to/file.test.ts
npx vitest run --filter "test name"   # SDK tests from packages/sdk/

# Typecheck & Lint
pnpm typecheck                        # Typecheck all workspaces
pnpm lint                             # Lint all workspaces

# Deploy (self-hosted)
npx convex dev --once                 # Deploy schema + functions + components (uses .env.local)
npx convex deploy                     # Deploy to production
npx convex deploy --dry-run           # Validate without deploying

# Seeding
npx convex run seeds:seedAll          # Seed core tables (tenants, users, resources, etc.)
npx convex run seedComponents:seedAll # Seed component tables (reviews, notifications, registry, etc.)
npx convex run seeds:resetAll         # Reset all core table data
npx convex run seedComponents:resetAll # Reset component table data

# Migrations (app tables → component tables)
npx convex run migrations/index:getMigrationStatus  # Check migration status
npx convex run migrations/index:runAllMigrations     # Migrate all data
npx convex run migrations/index:migrateReviews       # Migrate single domain

# Component management
npx convex run --component audit functions:listForTenant '{"tenantId":"..."}'
```

## Architecture

### Three-Plane Design + Component Architecture

```
Experience Plane (apps/)            — 2 thin React apps, compose providers, no business logic
  ├── web (port 5190)               — Public: discovery, booking, tickets, resale (17 routes)
  └── dashboard (port 5180)         — Tenant workspace: resources, ticketing, billing, analytics (205 routes)

SDK Layer (packages/sdk/)           — Source-only, type-safe Convex hooks (no build step)
  ├── convex-provider.tsx           — React context provider (XalaConvexProvider)
  ├── convex-api.ts                 — Re-exports convex/_generated/api
  ├── hooks/                        — 583 hooks across 63 files (~24K LOC)
  ├── transforms/                   — 16 field mapping files: Convex Resource ↔ Digilist Listing, epoch ↔ ISO
  └── compat/                       — No-op shims: initializeClient, queryKeys, realtime

Control Plane (convex/)             — Plug-and-play component architecture
  ├── convex.config.ts              — App config, registers all 24 components
  ├── schema.ts                     — Core tables (tenants, users, orgs, resources, event bus, registry)
  ├── domain/                       — 49 facade functions (386 exports, ~26K LOC)
  ├── components/                   — 24 isolated Convex components (see below)
  ├── lib/                          — Platform infrastructure (event bus, middleware, rate limits, contracts)
  ├── migrations/                   — Data migration scripts (app tables → component tables)
  ├── auth/                         — OAuth callback, password auth (transitional, moving to auth component)
  ├── crons.ts                      — 11 scheduled jobs (event bus, cart expiry, session cleanup, etc.)
  └── [tenants|users|orgs|...]      — Platform management functions
```

### 20 Convex Components (convex/components/)

Each component has isolated tables, functions, and schema (81 tables, 265 exports total). Components communicate via the event bus (outbox pattern). Replacing a component is plug-and-play: implement the same contract, swap in convex.config.ts.

```
convex/components/
  # Platform Layer (tenant-agnostic infrastructure)
  ├── auth/           — Sessions + OAuth states + magic links + demo tokens
  ├── rbac/           — Roles + user-role bindings (18 permission strings)
  ├── audit/          — Polymorphic audit log with state diffs
  ├── compliance/     — Consent records + DSAR requests + policy versions
  ├── tenant-config/  — Feature flags + branding + theme overrides
  ├── notifications/  — In-app + push notifications, preferences, templates, queue
  ├── user-prefs/     — Favorites + saved filters
  ├── integrations/   — Integration configs + webhooks + sync logs
  ├── guides/         — User guides + sections + articles + progress
  ├── support/        — Support tickets + ticket messages
  # Domain Layer (generic SaaS entities)
  ├── classification/ — Hierarchical categories + flat tags + custom attributes
  ├── resources/      — Generic entity: items, projects, listings (rich schema)
  ├── pricing/        — Pricing groups + resource pricing + holidays + discounts + surcharges
  ├── billing/        — Payments + invoices + payment methods + reconciliation
  ├── subscriptions/  — Membership tiers + memberships + benefit usage
  ├── reviews/        — Reviews + helpful votes + moderation
  ├── externalReviews/ — Google Places, TripAdvisor review aggregation
  ├── addons/         — Addons + resource-addons
  ├── analytics/      — Analytics events + report schedules + snapshots
  └── messaging/      — Conversations + messages + attachments
```

### Facade Pattern (SDK Compatibility)

Domain files in `convex/domain/` serve as **facades** that delegate to components. This preserves the `api.domain.{module}.{function}` paths that SDK hooks use — no SDK changes needed when components are swapped.

Facade responsibilities:

1. Accept typed `v.id("tenants")` args from SDK
2. Convert to `string` for component calls
3. Enrich results with core table data (user names, resource names)
4. Create audit entries via audit component
5. Emit events to the event bus

### Platform Infrastructure (convex/lib/)

- **eventBus.ts** — Outbox pattern for decoupled component communication
- **componentContract.ts** — `defineContract()` for standardized component API shapes
- **componentMiddleware.ts** — Middleware chain (auth, tenant, rate limit, RLS, audit, events)
- **rateLimits.ts** — Per-tenant/per-user rate limiting definitions
- **convex_lib.ts** — Re-exports from convex-helpers (relationships, validators, CRUD, RLS, triggers)
- **triggers.ts** — Database triggers with event bus integration
- **functions.ts** — Tenant-aware custom function builders

### Shared Infrastructure (Auth, Realtime, RBAC, Feature Flags)

**All apps must use shared infrastructure for consistent SSO, RBAC, and feature gating.** Do not implement auth, realtime, RBAC, or feature flags in app-local code. Import from `@digipicks/app-shell` or `@digipicks/sdk`.

| Concern           | Source                 | Exports                                                                     |
| ----------------- | ---------------------- | --------------------------------------------------------------------------- |
| **Auth**          | `@digipicks/app-shell` | `AuthProvider`, `useAuth` — wraps SDK; same session/SSO across apps         |
| **Realtime**      | `@digipicks/app-shell` | `RealtimeProvider`, `useRealtimeListingUpdates`, `useRealtimeBooking`, etc. |
| **RBAC**          | `@digipicks/app-shell` | `useRBAC`, `ROLE_CAPABILITIES`, `getCapabilitiesForRole`                    |
| **Feature flags** | `@digipicks/app-shell` | `FeatureGate` — gates by tenant module config                               |

**Rule:** Apps and packages (e.g. digilist) must import these from app-shell or SDK. No app-local `useAuth`, `AuthProvider`, or `RealtimeProvider` implementations except when app-shell is explicitly extended (e.g. backoffice roles). See `docs/SHARED_INFRASTRUCTURE.md` for current state and migration notes.

### Shared Packages

- **`@digipicks/app-shell`** — Provider composition (`XalaProviders`), auth context (`AuthProvider`), route guards (`RequireAuth`/`ProtectedRoute`), realtime (`RealtimeProvider`/`ConvexRealtimeProvider`), RBAC (`useRBAC`), feature flags (`FeatureGate`), shared layout.
- **`@digipicks/i18n`** — i18next with `nb`, `en`, `ar` locales
- **`@digipicks/shared`** — Types, constants, navigation config; multi-entry (`./types`, `./constants`, `./navigation`)
- **`@digipicks/ds`** — Design system following [Digdir Designsystemet](https://designsystemet.no/no) for principles and compliance; includes component registry (`./registry`)
- **`@digipicks/ds-themes`** — Theme tokens for the design system

### Registry — Dictionary, Gazetteer & Gatekeeper

**`@digipicks/ds/registry`** is the authoritative reference for components, patterns, and standards. AI agents and developers MUST consult it before generating UI, auth, or infrastructure code.

- **Dictionary** — Maps intents and raw HTML → canonical components (`resolveNeed()`, `getComponent()`)
- **Gazetteer** — Index of components, patterns, guidelines, providers (`GAZETTEER_INDEX`)
- **Gatekeeper** — Non-negotiable rules (`PROHIBITIONS`, `REQUIREMENTS`, `DECISION_FLOWS`)
- **Guide** — `packages/ds/registry/AGENT_GUIDE.md` — Start here for guided tour

### Using @digipicks/shared Types

The `@digipicks/shared` package is the **single source of truth for platform types** (auth, tenant, category, amenity, api, etc.). Import these from shared instead of defining locally.

**For Convex-backed domain entities** (Listing, Booking, User, Organization): the **SDK is canonical**. Shared has some overlapping types (listing.ts, booking.ts) that may be stale or conflict with the Convex schema. Prefer importing from `@digipicks/sdk` for Listing, ListingStatus, BookingModel, Booking, User (org-scoped), Organization.

**Type files** (`packages/shared/src/types/`):

- `common.ts` — Base types: `Id`, `Timestamp`, `Pricing`, `Location`, `Image`, `App`, `Locale`
- `auth.ts` — `User`, `Session`, `Role`, `Permission`, `AuthState`
- `tenant.ts` — `Tenant`, `Organization`, `TenantUser`
- `listing.ts` — `Listing`, `ListingType`, `ListingStatus`, `ListingInput`, `ListingQuery`
- `booking.ts` — `Booking`, `BookingStatus`, `CalendarEvent`, `TimeSlot`, `Block`
- `category.ts` — `Category`, `CategoryWithSubcategories`, `CategoryOption`
- `amenity.ts` — `Amenity`, `AmenityGroup`, `AmenityOption`
- `filter.ts` — `ListingFilterState`, `FilterOption`, `SortOption`, `PriceRange`, `DateRange`
- `api.ts` — `PaginatedResponse`, `ProblemDetails`, `ApiError`, `QueryOptions`

**Usage examples**:

```typescript
// Import specific types
import type { Listing, Category, Amenity } from '@digipicks/shared/types';

// Import from main entry (re-exports all)
import type { ListingFilterState, PaginatedResponse } from '@digipicks/shared';

// Import constants
import { APPS, SUPPORTED_LOCALES } from '@digipicks/shared/constants';
```

**Adding new types**:

1. Add to the appropriate file in `packages/shared/src/types/`
2. Export from `packages/shared/src/types/index.ts`
3. Run `pnpm -F @digipicks/shared build` to rebuild

### Thin App Pattern

Every app follows the same entry structure — compose providers, render routes:

```
XalaConvexProvider (sdk) → ThemeProvider → I18nProvider → AuthProvider/BackofficeAuthBridge → [RealtimeProvider|ConvexRealtimeProvider] → BrowserRouter → App
```

Both apps (`web`, `dashboard`) use `@digipicks/ds` for the design system (Digdir Designsystemet) and `@digipicks/sdk` for data hooks. Business logic lives in Convex functions and SDK hooks, not in apps.

### Convex Function Patterns

**Component function** (inside `convex/components/{name}/functions.ts`):

```typescript
import { query, mutation } from './_generated/server'; // Component's own server
import { v } from 'convex/values';

export const list = query({
  args: { tenantId: v.string() /* v.string() for ALL external refs */ },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return ctx.db
      .query('reviews')
      .withIndex('by_tenant', (q) => q.eq('tenantId', args.tenantId))
      .collect();
  },
});
```

**Facade function** (in `convex/domain/{module}.ts`):

```typescript
import { query } from '../_generated/server'; // App's server
import { components } from '../_generated/api';
import { v } from 'convex/values';

export const list = query({
  args: { tenantId: v.id('tenants') }, // Typed IDs from SDK
  handler: async (ctx, { tenantId }) => {
    // 1. Delegate to component (convert typed ID to string)
    const data = await ctx.runQuery(components.reviews.functions.list, {
      tenantId: tenantId as string,
    });
    // 2. Enrich with core table data (user names, etc.)
    // 3. Return enriched data to SDK
    return data;
  },
});
```

**App-level function** (core tables like resources, search):

```typescript
import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: { tenantId: v.id('tenants') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('resources')
      .withIndex('by_tenant', (q) => q.eq('tenantId', args.tenantId))
      .collect();
  },
});
```

### Database Schema

**Core tables** (in `convex/schema.ts`) — 13 tables shared across all components:

- **Identity**: tenants, organizations, users, tenantUsers
- **Custody**: custodyGrants, custodySubgrants
- **Infrastructure**: outboxEvents (event bus), componentRegistry (component slots)
- **Commerce**: counter, products, kiosk

**CRITICAL RULE**: Facade args must use `v.string()` (not `v.id("tableName")`) for ANY table that moved to a component. Only core tables above can use `v.id()`. This includes resources, bookings, reviews, sessions, roles, payments, etc.

**Component tables** (in `convex/components/{name}/schema.ts`) — isolated per component:

- Each component defines its own tables with `v.string()` for external references
- Components cannot directly query other components' tables
- Cross-component data access happens through the facade layer

Status types are defined in `convex/types.ts` as string literal unions.

### Component Contract Pattern

Every component should define a contract (`contract.ts`) declaring its API shape:

```typescript
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
  name: "reviews",
  version: "1.0.0",
  category: "domain",
  queries: { list: { args: {...}, returns: v.array(v.any()) } },
  mutations: { create: { args: {...}, returns: v.object({ id: v.string() }) } },
  emits: ["reviews.review.created"],
  subscribes: ["resources.resource.deleted"],
  dependencies: { core: ["tenants", "users", "resources"], components: [] },
});
```

### Adding a New Component

1. Create `convex/components/{name}/` with `convex.config.ts`, `schema.ts`, `functions.ts`
2. Register in `convex/convex.config.ts`: `import comp from "./components/{name}/convex.config"; app.use(comp);`
3. Create facade in `convex/domain/{name}.ts` (delegates to component, enriches data)
4. Create SDK hooks in `packages/sdk/src/hooks/use-{name}.ts`
5. Run `npx convex dev` to generate `_generated/` for the component
6. Add component to seed script: `convex/seedComponents.ts`

## Git Workflow

- **Default branch**: `develop` — all work happens here
- **Protected branch**: `main` — only receives merges from `develop` when verified and stable
- **No feature branches** — commit directly to `develop`
- **Before starting any task**: `git checkout develop && git pull origin develop`
- **Commit after each meaningful step** — small, incremental commits
- **Push regularly** during work, not only at the end
- **Commit message format**: `feat(DIGAAA-NNN): description` (or `fix`, `test`, `refactor`, `docs`)
- **Merge to main**: Only when changes are verified and stable — `git checkout main && git merge develop && git push origin main`

```bash
# Standard workflow
git checkout develop
git pull origin develop
# ... do work ...
git add <files>
git commit -m "feat(DIGAAA-42): implement booking filters"
git push origin develop
```

## Key Conventions

- **Errors**: RFC7807 format (`type`, `title`, `status`, `detail`, `instance`)
- **Tenant isolation**: Enforced at function level, not database level. Every query/mutation validates tenant membership.
- **Audit**: All mutations create audit events via the **audit component** (`components.audit.functions.create`)
- **Idempotency**: Mutations support idempotency keys
- **i18n**: Default locale is `nb` (Norwegian Bokmål), RTL support for `ar`
- **Module system**: Feature modules are gated — functions check `hasModuleEnabled()` from `convex/lib/componentMiddleware.ts`
- **Event bus**: Components communicate via outbox events (`outboxEvents` table), processed every 1 min by cron, 31 event topics, 3 retries with exponential backoff, never direct cross-component calls
- **Facade pattern**: SDK hooks call `api.domain.{module}.*` — facades delegate to components, no SDK changes needed
- **Component isolation**: Component functions use `v.string()` for external references, never `v.id("otherTable")`
- **Rate limiting**: Defined in `convex/lib/rateLimits.ts`, applied in facade mutations
- **Plug-and-play**: Any component implementing the same contract can be swapped in `convex.config.ts`

## Test Structure (1,465 tests)

| Layer                  | Tests | Files |
| ---------------------- | ----- | ----- |
| Component (Convex)     | ~625  | 20    |
| Domain facade (Convex) | ~410  | 24    |
| Lib infrastructure     | ~215  | 13    |
| SDK hooks              | 217   | 16    |

- **SDK tests** (`packages/sdk/src/__tests__/`): Vitest + jsdom + React Testing Library
- **Component tests** (`convex/components/**/__tests__/`): Vitest + edge-runtime + `convex-test`
- **Domain facade tests** (`convex/domain/__tests__/`): Vitest + edge-runtime + `convex-test`
- **Pure logic tests** (`convex/lib/__tests__/`): Vitest + edge-runtime — pricing math, slot generation, contract validation, rate limits
- **E2E backend tests** (`tests/convex/e2e/`): Custom runner via `tsx tests/convex/e2e/runner.ts`
- **Browser E2E** (`tests/e2e/`): Playwright, Desktop Chrome, sequential (1 worker)
- **A-krav E2E** (`tests/e2e/a-krav/`): 11 compliance test suites (A–K) for municipal tender requirements

Test config: `convex/vitest.config.ts` for all Convex tests (components + domain + lib), `packages/sdk/vitest.config.ts` for SDK tests, `playwright.config.ts` at root for browser E2E.

## Relevant Docs

### Architecture (docs/architecture/)

- `PLATFORM_STATE.md` — Current platform inventory: 19 components, 35 facades, 49 SDK hooks, 51 dashboard routes
- `architecture-overview-v1.md` — Full system architecture, three-plane design, domain model, scale metrics
- `domain-contracts-v1.md` — Component contracts and API shapes (49 facades documented)
- `compliance-matrix-v1.md` — A-krav compliance requirements matrix (11/11 A-krav oppfylt)
- `settlement-model-v1.md` — Payment settlement and reconciliation
- `gdpr-data-inventory-v1.md` — GDPR data mapping per component
- `wcag-audit-v1.md` — WCAG 2.1 AA accessibility audit
- `pos-counter-spec-v1.md` — Point-of-sale counter specification
- `kiosk-spec-v1.md` — Self-service kiosk specification
- `backup-dr-v1.md` — Backup and disaster recovery
- `sla-metrics-spec-v1.md` — SLA metric definitions
- `release-policy-v1.md` — Release and deployment policy
- `alerting-runbook-v1.md` — Alerting and incident runbook

### Platform (docs/)

- `SHARED_INFRASTRUCTURE.md` — Auth, realtime, RBAC, feature flags: canonical sources and migration
- `CONVENTIONS.md` — Tenant boundaries, idempotency, RFC7807 errors, outbox events, audit requirements
- `SECURITY_INVARIANTS.md` — Non-negotiable security rules (tenant isolation, auth, authorization, audit)
- `COMPONENT_ARCHITECTURE.md` — Component architecture, facade pattern, event bus, plug-and-play design
- `DOMAIN_BUNDLE_SPEC.md` — Module contract: schema + functions + SDK hooks + tests
- `MIGRATION_POLICY.md` — Schema change procedures (forward-only, additive preferred)
- `DEFINITION_OF_DONE.md` — Feature completion gates
- `RTL_USAGE.md` — RTL layout support (ar locale), logical CSS recommendations

## UI Standards (Non-Negotiable)

These rules mirror `@digipicks/ds/registry/gatekeeper.ts`. Violations block approval.

### NEVER

- Raw HTML for UI (`<button>`, `<input>`, `<select>`, `<table>`, `<h1>`–`<h6>`, `<p>`) → use DS: `Button`, `Textfield`, `Select`, `DataTable`, `Heading`, `Paragraph`
- Direct `@digdir/*` imports → import from `@digipicks/ds`
- Inline `<svg>` → use Icon components from `@digipicks/ds`
- Plain `.css` files → use `.module.css`
- Hardcoded colors (hex/rgb/rgba) → use `--ds-color-*` tokens
- Hardcoded `px` for spacing → use `--ds-size-*` tokens
- App-local AuthProvider/useAuth → use `@digipicks/app-shell`
- App-local realtime/WebSocket providers → use `RealtimeProvider` from `@digipicks/app-shell`
- Hardcoded Norwegian/English UI strings → use `t()` from `@digipicks/i18n`

### ALWAYS

- Import UI components from `@digipicks/ds`
- Use `.module.css` for component styles with `--ds-*` tokens
- Use `t('namespace.key')` for all user-facing text
- Check `@digipicks/ds/registry` (gatekeeper, gazetteer) before adding new UI patterns
- Use `data-size`, `data-color` props (not className) for DS component variants

### When You Need...

| Need         | Use                                       | Source                 |
| ------------ | ----------------------------------------- | ---------------------- |
| Button       | `<Button>`                                | `@digipicks/ds`        |
| Text input   | `<Textfield>`                             | `@digipicks/ds`        |
| Dropdown     | `<Select>` or `<NativeSelect>`            | `@digipicks/ds`        |
| Layout       | `ContentLayout`, `PageHeader`             | `@digipicks/ds`        |
| Dialog       | `useDialog().confirm()` + `ConfirmDialog` | `@digipicks/ds`        |
| Auth gate    | `AuthProvider` + `ProtectedRoute`         | `@digipicks/app-shell` |
| Data display | `<DataTable>`                             | `@digipicks/ds`        |
| Side panel   | `<Drawer>` or `<FilterDrawer>`            | `@digipicks/ds`        |
| Dashboard    | `DashboardLayout`                         | `@digipicks/app-shell` |

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->
