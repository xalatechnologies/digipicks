# Xala Foundation

A production-grade SaaS platform core built on [Convex](https://convex.dev). Multi-tenant isolation, RBAC, billing, messaging, classification, compliance, and AI readiness — consumed by 2 React apps through a type-safe SDK.

**Not a starter kit.** A complete SaaS foundation with 20 components, 1,628 tests, and 17/17 module coverage.

## Quick Start (New Project)

```bash
# 1. Create from template
gh repo create my-saas --template xalatechnologies/xala-saas-foundation --clone
cd my-saas

# 2. Run the setup wizard
node scripts/setup.mjs

# 3. Start developing
pnpm dev
```

The setup wizard configures your project name, npm scope, branding, Convex backend, and dependencies in one step.

## Quick Start (Existing Clone)

```bash
pnpm install
npx convex dev          # Start Convex backend
pnpm dev:all            # Start all apps
```

## Apps

| App | Port | Description |
|-----|------|-------------|
| **web** | 5190 | Public site — landing, pricing, blog, auth |
| **dashboard** | 5180 | Tenant workspace — admin, billing, org management, settings |

## What's Included

### 17 SaaS Modules (all production-ready)

| Module | What it covers |
|--------|---------------|
| Identity & Access | Auth (email, OAuth, magic link, BankID), sessions, MFA, SSO |
| Multi-Tenancy | Tenant isolation, organizations, memberships |
| RBAC | Roles, permissions, capabilities, feature gating |
| Billing | Stripe, Adyen, Vipps, invoices, subscriptions |
| Resources | Generic entity CRUD, lifecycle states, metadata |
| Classification | Hierarchical categories, tags, custom attributes |
| Search | Full-text, faceted filtering, typeahead |
| Notifications | In-app, email, preferences, event-triggered |
| Automation | Background jobs, crons, event bus, retry/dead-letter |
| Integrations | Webhooks, OAuth, API keys, external APIs |
| Analytics | Activity logs, usage tracking, SLA metrics |
| Security | Audit logs, GDPR, consent, data retention, tenant isolation |
| UI/UX | 62-component design system, theming, white-labeling |
| Localization | 3 locales (nb, en, ar), RTL, runtime switching |
| AI | WebMCP tools, agent exposure, LLM-ready |
| Admin | Platform dashboard, user/tenant management, feature flags |
| Data Lifecycle | Export, import, soft delete, retention policies |

### Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript |
| Backend | Convex (serverless DB + functions) |
| Design System | 62 components (Digdir Designsystemet) |
| SDK | 51 type-safe hooks |
| API | OpenAPI REST adapter + Swagger UI |
| Payments | Stripe, Adyen, Vipps |
| Auth | OAuth, magic links, email OTP, BankID |
| i18n | Norwegian, English, Arabic (RTL) |

## Architecture

```
apps/
  web/              — Public site (13 routes)
  dashboard/        — Tenant workspace (51 routes)

packages/
  sdk/              — 51 Convex hooks + transforms
  ds/               — 62 design system components
  app-shell/        — Providers, auth, layout, guards
  shared/           — Types, constants, navigation
  i18n/             — Localization (nb, en, ar)
  cli/              — Code generation scaffolding

convex/
  components/       — 20 isolated components (81 tables)
  domain/           — 38 facade functions
  lib/              — Event bus, middleware, auth, rate limits
  api/              — OpenAPI route registry
```

Components communicate via an event bus (outbox pattern) and can be swapped by implementing the same contract.

## Shared Packages

| Package | Description |
|---------|-------------|
| `@digilist-saas/sdk` | Convex hooks + transforms (source-only) |
| `@digilist-saas/ds` | Design system — 62 components |
| `@digilist-saas/app-shell` | Providers, auth, RBAC, layout, guards |
| `@digilist-saas/shared` | Types, constants, navigation config |
| `@digilist-saas/i18n` | i18next with nb, en, ar locales |
| `@digilist-saas/cli` | Code generation and verification |
| `@digilist-saas/eslint-config` | Shared ESLint v9 flat config |

> After running `node scripts/setup.mjs`, the `@digilist-saas` scope is replaced with your own.

## Testing

```bash
pnpm test:convex           # 1,271 Convex function tests
pnpm sdk:test              # 217 SDK hook tests
pnpm test:e2e              # Playwright browser E2E
pnpm test:all              # Full suite
```

**1,628 tests** across all packages.

## API

| Endpoint | Description |
|----------|-------------|
| `/api/docs` | Swagger UI — interactive API explorer |
| `/api/openapi.json` | OpenAPI 3.0 spec |
| `/api/v1/*` | 20 REST endpoints (resources, billing, auth, etc.) |

## Configuration

All branding and infrastructure is configured via environment variables:

```bash
# Branding
VITE_PLATFORM_NAME=My Platform
VITE_PLATFORM_TAGLINE=Your tagline
PLATFORM_NAME=My Platform

# Email
EMAIL_FROM=noreply@example.com
SUPPORT_EMAIL=support@example.com

# Payments (set in Convex Dashboard)
STRIPE_SECRET_KEY=sk_...
VIPPS_CLIENT_ID=...
```

See `.env.example` for the full list.

## Build & Deploy

```bash
pnpm typecheck             # Typecheck all 9 workspaces
pnpm lint                  # Lint all workspaces
npx convex deploy          # Deploy backend to production
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Architecture, conventions, commands
- [docs/architecture/PLATFORM_STATE.md](./docs/architecture/PLATFORM_STATE.md) — Full platform inventory

## License

MIT
