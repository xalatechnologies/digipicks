# Xala Foundation — Platform State

> Production-grade SaaS platform core. 20 components, 1,488 tests, 17/17 module coverage.

## At a Glance

| Metric                   | Count                              |
| ------------------------ | ---------------------------------- |
| Convex Components        | 20                                 |
| Component Tables         | 81                                 |
| Component Functions      | 265 (126 queries + 139 mutations)  |
| Domain Facades           | 38 (360+ exports)                  |
| Core Schema Tables       | 15                                 |
| SDK Hooks                | 51                                 |
| Dashboard Routes         | 51                                 |
| Web Routes               | 13                                 |
| Design System Components | 62                                 |
| Supported Locales        | 3 (nb, en, ar)                     |
| Test Files               | 68 (Convex) + 16 (SDK) = 84        |
| Tests Passing            | 1,248 (Convex) + 217 (SDK) = 1,465 |
| SaaS Module Coverage     | 17/17 (100%)                       |

---

## Architecture Overview

```
Experience Plane (apps/)
  ├── web (13 routes)          — Public: login, register, listings, pricing, blog, about, FAQ
  └── dashboard (51 routes)    — Tenant workspace: admin, billing, org, settings, categories

SDK Layer (packages/sdk/)
  ├── 49 hooks                 — Type-safe Convex hooks
  ├── 10 transforms            — Convex Resource <-> Listing, epoch <-> ISO
  └── webmcp/                  — AI agent tool exposure

Shared Packages
  ├── @digipicks/app-shell — 13 providers, 11 hooks, layout, auth guards
  ├── @digipicks/ds        — 66 components (Digdir Designsystemet)
  ├── @digipicks/shared    — 21 type modules, constants, navigation
  └── @digipicks/i18n      — nb, en, ar with RTL support

Control Plane (convex/)
  ├── 19 components            — Isolated tables + functions + contracts
  ├── 35 domain facades        — SDK-compatible wrappers
  ├── 15 core tables           — Identity, infrastructure, financial
  └── lib/                     — Event bus, middleware, auth, rate limits
```

---

## 19 Convex Components

### Platform Infrastructure (10)

| Component     | Tables | Functions | Purpose                                          |
| ------------- | ------ | --------- | ------------------------------------------------ |
| auth          | 6      | 19        | Sessions, OAuth, magic links, demo tokens        |
| rbac          | 3      | 10        | Roles, user-role bindings, 18 permission strings |
| audit         | 2      | —         | Polymorphic audit log with state diffs           |
| compliance    | 4      | 13        | Consent records, DSAR requests, policy versions  |
| tenant-config | 6      | 18        | Feature flags, branding, theme overrides         |
| notifications | 6      | —         | In-app + push notifications, preferences, queue  |
| user-prefs    | 3      | —         | Favorites, saved filters                         |
| integrations  | 4      | 18        | Integration configs, webhooks, sync logs         |
| guides        | 5      | 5         | User guides, sections, articles, progress        |
| support       | 3      | 10        | Support tickets, ticket messages                 |

### Domain (9)

| Component       | Tables | Functions | Purpose                                                           |
| --------------- | ------ | --------- | ----------------------------------------------------------------- |
| resources       | 2      | 21        | Generic entity: venues, items, projects                           |
| pricing         | 12     | 38        | Pricing groups, resource pricing, holidays, discounts, surcharges |
| billing         | 5      | 35        | Payments, invoices, payment methods, reconciliation               |
| addons          | 4      | 14        | Addons, resource-addons                                           |
| subscriptions   | 4      | —         | Membership tiers, memberships, benefit usage                      |
| reviews         | 3      | —         | Reviews, helpful votes, moderation                                |
| externalReviews | 3      | —         | Google Places, TripAdvisor review aggregation                     |
| messaging       | 4      | 22        | Conversations, messages, attachments                              |
| classification  | 3      | 18        | Categories (hierarchical), tags, custom attributes                |
| analytics       | 5      | —         | Analytics events, report schedules, snapshots                     |

---

## Core Schema (15 tables)

### Identity & Tenancy

- **tenants** — Multi-tenant instances, ownership, licensing, feature flags
- **organizations** — Organizational hierarchy within tenants
- **users** — User identities, auth state, MFA, verification
- **tenantUsers** — Tenant-user membership join table
- **custodyGrants / custodySubgrants** — Resource custody delegation

### Infrastructure

- **outboxEvents** — Outbox pattern for decoupled component messaging
- **componentRegistry** — Component lifecycle tracking, versions, dependencies
- **webhookSubscriptions** — Outbound webhooks for external integrations
- **platformConfig** — Platform-level feature flags and configuration
- **emailCodes** — Email OTP login codes

### Financial

- **payouts** — Owner revenue settlements
- **tenantBankAccounts** — Bank accounts for payouts
- **licenseBilling** — Per-object license pricing

---

## 35 Domain Facades (by size)

| Facade               | Exports | Purpose                                           |
| -------------------- | ------- | ------------------------------------------------- |
| pricing              | 45      | Pricing operations — surcharges, discounts, rules |
| billing              | 33      | Invoices, payments, economy stats                 |
| notifications        | 25      | Notification delivery and preferences             |
| integrations         | 22      | RCO, Visma, BRREG, calendar sync                  |
| resources            | 20      | Resource CRUD, publish/archive, clone             |
| messaging            | 18      | Conversations, messages, templates                |
| addons               | 14      | Addon management and resource associations        |
| authSessions         | 11      | Session management                                |
| reviews              | 11      | Review CRUD and moderation                        |
| support              | 11      | Support ticket management                         |
| audit                | 10      | Audit log recording                               |
| rbacFacade           | 10      | Role and permission management                    |
| listingModeration    | 9       | Submit, approve, reject workflow                  |
| platformAdmin        | 8       | Platform admin operations                         |
| externalReviews      | 8       | External review sync                              |
| licensing            | 7       | License management                                |
| payouts              | 7       | Payout processing                                 |
| verifyApi            | 7       | Phone/email verification                          |
| webhookSubscriptions | 7       | Webhook CRUD                                      |
| search               | 6       | Global search and facets                          |
| tenantConfig         | 6       | Tenant feature flags and config                   |
| favorites            | 6       | User favorites                                    |
| tenantOnboarding     | 6       | Self-service tenant creation                      |
| additionalServices   | 6       | Additional services                               |
| guides               | 5       | Guide management                                  |
| reminders            | 4       | Reminder scheduling                               |
| compliance           | 4       | GDPR compliance                                   |
| integrationDispatch  | 4       | Integration routing                               |
| listingReports       | 3       | Content reporting                                 |
| messagingNotify      | 3       | Message notifications                             |
| monitoring           | 3       | SLA metrics and health checks                     |
| gdpr                 | 3       | Data export and purge                             |
| userLookup           | 2       | User search utilities                             |
| analytics            | 1       | Revenue analytics                                 |
| organizationVerify   | 1       | Org verification                                  |
| classification       | 12      | Categories, tags, attribute definitions           |
| subscriptions        | 1       | Public subscription tiers                         |
| retention            | 1       | Automated data lifecycle purge                    |

---

## SDK Hooks (49)

### Core Data

`use-resources`, `use-listings`, `use-addons`, `use-additional-services`, `use-pricing`, `use-reviews`, `use-external-reviews`, `use-search`, `use-favorites`

### Auth & Users

`use-auth`, `use-signup`, `use-email-code`, `use-magic-link`, `use-mfa`, `use-oauth-callback`, `use-verification`, `use-org-members`, `use-organizations`

### Messaging & Notifications

`use-conversations`, `use-messaging`, `use-notifications`, `use-support-tickets`

### Admin & Config

`use-audit`, `use-billing`, `use-economy`, `use-compliance`, `use-gdpr`, `use-integrations`, `use-webhooks`, `use-email-templates`, `use-tenant-config`, `use-tenant-branding`, `use-tenant-onboarding`, `use-moderation`, `use-monitoring`, `use-listing-permissions`, `use-reports`, `use-analytics`

### Infrastructure

`use-tenant-id`, `use-tenant-from-host`, `use-file-upload`, `use-geocode`, `use-dynamic-filter-counts`, `use-listing-filter-options`, `use-listing-filters`, `use-listing-card-actions`, `use-accessibility-monitoring`, `use-docs-guides`

---

## Dashboard Routes (51)

| Area               | Routes | Description                                                                                           |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| Core/Auth          | 7      | dashboard, login, welcome, onboarding, role-selection, auth/magic-link callbacks                      |
| Platform Admin     | 10     | overview, audit, billing, moderation, modules, tenants, tenant-form, users, user-form, user-detail    |
| Tenant Config      | 3      | settings, branding, audit-log                                                                         |
| Organization       | 6      | dashboard, activity, invoices, members, settings, index                                               |
| My Profile         | 3      | home, billing, preferences                                                                            |
| Support & Settings | 8      | users-management, webhook-settings, settings, support, help, gdpr, equipment-services, audit-timeline |
| Integrations       | 2      | integrations, integration-edit                                                                        |
| Email Templates    | 2      | email-templates, email-template-edit                                                                  |
| Form Builder       | 2      | form-builder, form-builder-edit                                                                       |
| Notifications      | 2      | notifications, notification-settings                                                                  |
| Listings           | 6      | listings, listing-wizard, listing-edit, listing-content, innhold, pricing-rules                       |

---

## Infrastructure Highlights

### Payment Processors

Stripe, Adyen, Vipps (Norwegian market) — all with webhook reconciliation

### Authentication

OAuth (Signicat/OIDC), magic links, email OTP, password, demo tokens, MFA

### Event Bus

Outbox pattern via `outboxEvents` table — decoupled component communication, 3 retries with exponential backoff, processed by cron every minute

### Compliance

GDPR (consent, DSAR, data export/purge), SOC2 audit contracts, row-level security

### Data Lifecycle

Retention policies per tenant (configurable days for soft-deleted, archived, audit, notifications). Daily cron purge at 02:00 UTC. GDPR export/purge for users and tenants.

### Server-Side Error Tracking

`withErrorTracking()` wrapper for Convex functions — structured JSON logging + Sentry HTTP Ingest. Sensitive args auto-sanitized.

### Norwegian Market

Altinn integration, Vipps payments, nb/en/ar locales

---

## App Routes

### Dashboard App (50 routes)

All routes are statically imported. Protected routes use `ProtectedRouteConnected` with role/capability guards. The root `/` uses `RoleAwareIndex` to redirect based on effective role (superadmin -> /platform, admin -> dashboard, user -> /my).

#### Auth (5 routes, unguarded)

| Path               | Component             |
| ------------------ | --------------------- |
| `/login`           | LoginPage             |
| `/auth/callback`   | AuthCallbackPage      |
| `/auth/magic-link` | MagicLinkCallbackPage |
| `/role-selection`  | RoleSelectionPage     |
| `/onboarding`      | OnboardingPage        |

#### Core (5 routes)

| Path                     | Component                | Guard |
| ------------------------ | ------------------------ | ----- |
| `/`                      | RoleAwareIndex           | auth  |
| `/welcome`               | WelcomePage              | auth  |
| `/notifications`         | NotificationsPage        | auth  |
| `/notification-settings` | NotificationSettingsPage | auth  |
| `/help`                  | HelpPage                 | auth  |

#### Platform Admin (12 routes, CAP_PLATFORM_ADMIN)

| Path                           | Component              |
| ------------------------------ | ---------------------- |
| `/platform`                    | PlatformOverviewPage   |
| `/platform/tenants`            | PlatformTenantsPage    |
| `/platform/tenants/new`        | PlatformTenantFormPage |
| `/platform/tenants/:slug`      | PlatformTenantFormPage |
| `/platform/tenants/:slug/edit` | PlatformTenantFormPage |
| `/platform/users`              | PlatformUsersPage      |
| `/platform/users/:id`          | PlatformUserDetailPage |
| `/platform/users/:id/edit`     | PlatformUserFormPage   |
| `/platform/modules`            | PlatformModulesPage    |
| `/platform/billing`            | PlatformBillingPage    |
| `/platform/audit`              | PlatformAuditPage      |
| `/platform/moderation`         | PlatformModerationPage |

#### Tenant Admin (10 routes, admin role)

| Path                     | Component                 |
| ------------------------ | ------------------------- |
| `/tenant/settings`       | TenantSettingsPage        |
| `/tenant/branding`       | TenantBrandingPage        |
| `/tenant/audit-log`      | Redirect -> `/audit`      |
| `/email-templates`       | EmailTemplatesPage        |
| `/email-templates/:slug` | EmailTemplateEditPage     |
| `/form-builder`          | FormBuilderPage           |
| `/form-builder/:slug`    | FormBuilderEditPage       |
| `/integrations`          | IntegrationsPage          |
| `/integrations/:slug`    | IntegrationEditPage       |
| `/support`               | SupportPage (FeatureGate) |

#### Admin Operations (5 routes)

| Path                  | Component             | Guard          |
| --------------------- | --------------------- | -------------- |
| `/audit`              | AuditPage             | admin          |
| `/audit-timeline`     | AuditTimelinePage     | admin          |
| `/settings`           | SettingsPage          | user           |
| `/users-management`   | UsersManagementPage   | CAP_USER_ADMIN |
| `/users/:id`          | UserDetailPage        | CAP_USER_ADMIN |
| `/equipment-services` | EquipmentServicesPage | admin          |

#### Personal (3 routes)

| Path              | Component           |
| ----------------- | ------------------- |
| `/my/billing`     | UserBillingPage     |
| `/my/preferences` | UserPreferencesPage |
| `/gdpr`           | GDPRPage            |

#### Organization (5 routes, user role)

| Path            | Component                 |
| --------------- | ------------------------- |
| `/org`          | OrganizationDashboardPage |
| `/org/invoices` | OrganizationInvoicesPage  |
| `/org/members`  | OrganizationMembersPage   |
| `/org/settings` | OrganizationSettingsPage  |
| `/org/activity` | OrganizationActivityPage  |

### Web App (13 routes)

| Path                            | Component             | Guard      |
| ------------------------------- | --------------------- | ---------- |
| `/login`                        | LoginPage             | —          |
| `/register`                     | RegisterPage          | —          |
| `/auth/callback`                | AuthCallbackPage      | —          |
| `/auth/magic-link`              | MagicLinkCallbackPage | —          |
| `/`                             | ListingsPage          | MainLayout |
| `/pricing`                      | PricingPage           | MainLayout |
| `/blog`                         | BlogPage              | MainLayout |
| `/blog/:guideSlug`              | BlogGuidePage         | MainLayout |
| `/blog/:guideSlug/:articleSlug` | BlogArticlePage       | MainLayout |
| `/about`                        | AboutPage             | MainLayout |
| `/faq`                          | FAQPage               | MainLayout |
| `/min-side`                     | MinsideRedirect       | MainLayout |
| `/min-side/*`                   | MinsideRedirect       | MainLayout |

Header navigation includes: Pricing, Blog, About links. The "Bli utleier" button navigates to `/register` for tenant self-service registration.

---

## What Was Removed

7 domain components and all associated code:

| Removed           | Tables | Purpose (former)                                          |
| ----------------- | ------ | --------------------------------------------------------- |
| bookings          | 7      | Bookings, blocks, allocations, conflicts, agreements      |
| ticketing         | 8      | Performances, orders, tickets, seats, check-ins, cart     |
| catalog           | 4      | Categories, amenity groups, amenities, resource-amenities |
| giftcards         | 4      | Gift cards, transactions, designs, batches                |
| resale            | 4      | Resale configs, listings, transactions, disputes          |
| seasons           | 4      | Seasons, leases, applications, priority rules             |
| ownerApplications | 2      | Owner application submissions                             |

**Total removed:** 7 components, ~33 tables, ~200 functions, ~600 SDK hook exports, 24+ test files
