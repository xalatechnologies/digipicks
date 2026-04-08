# Web App — Thin Structure & Production Readiness

**Last verified:** 2025-02-13

## Thin App Structure ✅

The web app follows the thin app pattern per CLAUDE.md:

| Layer | Responsibility | Location |
|-------|----------------|----------|
| **Provider composition** | XalaConvexProvider → I18nProvider → BrowserRouter → ThemeProvider → AuthProvider → RealtimeProvider | App.tsx, main.tsx |
| **Routing** | Route definitions, MainLayout with header | App.tsx |
| **Pages** | Thin compositions: fetch via SDK, transform, pass to digilist components | routes/ |
| **Components** | None — all from @digilist-saas/ds, @digilist-saas/app-shell | — |
| **Hooks** | None — useAuth from app-shell | — |
| **Business logic** | None — all in Convex (backend) and SDK hooks | — |
| **Shared infra** | Auth, realtime, RBAC, feature flags from app-shell | @digilist-saas/app-shell |

### Key Imports

- **Auth**: `useAuth` from `@digilist-saas/app-shell`
- **Realtime**: `RealtimeToast` from `@digilist-saas/app-shell`; `useRealtimeBooking`, etc. from app-shell
- **Listing layout**: `ListingDetailsLayout` from `@digilist-saas/digilist/listings` with `variant="web"`
- **Types**: Import directly from `@digilist-saas/shared` (no features/ folder)

## Verification Checklist

| Check | Status |
|-------|--------|
| `pnpm typecheck` | ✅ Pass |
| `pnpm lint` | ✅ Pass |
| `pnpm --filter @digilist-saas/web build` | ✅ Pass |
| `pnpm --filter @digilist-saas/web test` | ✅ Pass (22 tests) |
| `pnpm sdk:test` | ✅ Pass |
| `pnpm test:convex` | ✅ Pass |

## Root Cleanup

- `dist/` — Build output (in .gitignore)
- `dev-dist/` — PWA dev artifacts (in root .gitignore `**/dev-dist/`)
- `providers/` — Removed (re-exports; import from @digilist-saas/app-shell)
- `features/` — Removed (types now from @digilist-saas/shared)

## Production Readiness

- All dependency imports resolve correctly
- No duplicate auth/realtime logic — delegated to app-shell
- Min-side redirects to minside app via `MinsideRedirect`
- Feature gating via `FeatureGate` (reviews, etc.)
