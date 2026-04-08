# DigiPicks

A premium creator-to-subscriber platform for sports betting picks. Think Patreon meets a professional sportsbook analytics tool.

Built on [Convex](https://convex.dev) with React, TypeScript, and a plug-and-play component architecture. Multi-tenant isolation, RBAC, billing, real-time feeds, and creator analytics — production-ready from day one.

## Quick Start

```bash
git clone https://github.com/xalatechnologies/digipicks.git
cd digipicks
pnpm install
npx convex dev          # Start Convex backend
pnpm dev:all            # Start all apps
```

## Apps

| App | Port | Description |
|-----|------|-------------|
| **web** | 5190 | Public site — landing, creator discovery, pricing, auth |
| **dashboard** | 5180 | Creator & subscriber workspace — picks, analytics, billing, settings |

## How It Works

**Creators** post structured picks (event, odds, units, sport) with result tracking (Won/Lost/Push/Pending). They set subscription tiers and build a following through verified performance stats.

**Subscribers** follow creators, view pick feeds (Following + For You), track their own P/L, and manage subscriptions. Premium picks are gated behind subscription tiers.

**Platform** handles payments (Stripe Connect), creator verification, leaderboards, notifications, and dispute resolution.

## Core Features

| Feature | Status |
|---------|--------|
| Creator pick posting with structured form | Phase 1 |
| Subscriber pick feed (Following + For You) | Phase 1 |
| Stripe Connect (checkout, payouts, webhooks) | Phase 1 |
| Creator profiles with 30-day stats, ROI chart | Phase 1 |
| Subscription gating (blur overlay + CTA) | Phase 1 |
| Real-time notifications (picks, results, events) | Phase 2 |
| Subscriber pick tracker + personal P/L | Phase 2 |
| Creator leaderboard (ROI, win rate, streak) | Phase 2 |
| Referral system + affiliate earnings | Phase 3 |
| Admin payouts dashboard | Phase 3 |
| Discord integration | Phase 4 |
| Auto-grading via odds API | Phase 4 |
| AI-powered insights + bankroll suggestions | Phase 5 |

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript |
| Backend | Convex (serverless DB + functions) |
| Design System | 62 components (Digdir Designsystemet) |
| SDK | 51+ type-safe hooks |
| API | OpenAPI REST adapter + Swagger UI |
| Payments | Stripe (Connect, Checkout, Webhooks) |
| Auth | OAuth, magic links, email OTP |
| Roles | Admin, Creator, Subscriber, Moderator |

## Architecture

```
apps/
  web/              — Public site (creator discovery, landing, auth)
  dashboard/        — Creator + subscriber workspace

packages/
  sdk/              — Convex hooks + transforms (source-only)
  ds/               — 62 design system components
  app-shell/        — Providers, auth, layout, guards
  shared/           — Types, constants, navigation
  i18n/             — Localization (nb, en, ar)
  cli/              — Code generation scaffolding

convex/
  components/       — 20 isolated components (81 tables)
  domain/           — 38+ facade functions
  lib/              — Event bus, middleware, auth, rate limits
  api/              — OpenAPI route registry
```

Components communicate via an event bus (outbox pattern) and can be swapped by implementing the same contract.

## Testing

```bash
pnpm test:convex           # Convex function tests
pnpm sdk:test              # SDK hook tests
pnpm test:e2e              # Playwright browser E2E
pnpm test:all              # Full suite
```

## Configuration

```bash
# Branding
VITE_PLATFORM_NAME=DigiPicks
VITE_PLATFORM_TAGLINE=Premium sports picks from verified creators

# Email
EMAIL_FROM=noreply@digipicks.com
SUPPORT_EMAIL=support@digipicks.com

# Payments (set in Convex Dashboard)
STRIPE_SECRET_KEY=sk_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

See `.env.example` for the full list.

## Build & Deploy

```bash
pnpm typecheck             # Typecheck all workspaces
pnpm lint                  # Lint all workspaces
npx convex deploy          # Deploy backend to production
```

## Git Workflow

Work on `develop`. Never commit directly to `main`. Merge to `main` only when changes are verified and stable.

```bash
git checkout develop
git pull origin develop
# ... make changes ...
git commit -m "feat(DIGAAA-50): update README"
git push origin develop
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Architecture, conventions, commands
- [docs/architecture/PLATFORM_STATE.md](./docs/architecture/PLATFORM_STATE.md) — Full platform inventory

## License

MIT
