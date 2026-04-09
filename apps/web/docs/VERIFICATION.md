# Web App — Thin Structure & Production Readiness

**Last verified:** 2025-02-13

## Thin App Structure ✅

The web app follows the thin app pattern per CLAUDE.md:

| Layer                    | Responsibility                                                                                      | Location             |
| ------------------------ | --------------------------------------------------------------------------------------------------- | -------------------- |
| **Provider composition** | XalaConvexProvider → I18nProvider → BrowserRouter → ThemeProvider → AuthProvider → RealtimeProvider | App.tsx, main.tsx    |
| **Routing**              | Route definitions, MainLayout with header                                                           | App.tsx              |
| **Pages**                | Thin compositions: fetch via SDK, transform, pass to digilist components                            | routes/              |
| **Components**           | None — all from @digipicks/ds, @digipicks/app-shell                                                 | —                    |
| **Hooks**                | None — useAuth from app-shell                                                                       | —                    |
| **Business logic**       | None — all in Convex (backend) and SDK hooks                                                        | —                    |
| **Shared infra**         | Auth, realtime, RBAC, feature flags from app-shell                                                  | @digipicks/app-shell |

### Key Imports

- **Auth**: `useAuth` from `@digipicks/app-shell`
- **Realtime**: `RealtimeToast` from `@digipicks/app-shell`; `useRealtimeBooking`, etc. from app-shell
- **Listing layout**: `ListingDetailsLayout` from `@digipicks/digilist/listings` with `variant="web"`
- **Types**: Import directly from `@digipicks/shared` (no features/ folder)

## Verification Checklist

| Check                                | Status             |
| ------------------------------------ | ------------------ |
| `pnpm typecheck`                     | ✅ Pass            |
| `pnpm lint`                          | ✅ Pass            |
| `pnpm --filter @digipicks/web build` | ✅ Pass            |
| `pnpm --filter @digipicks/web test`  | ✅ Pass (22 tests) |
| `pnpm sdk:test`                      | ✅ Pass            |
| `pnpm test:convex`                   | ✅ Pass            |

## Root Cleanup

- `dist/` — Build output (in .gitignore)
- `dev-dist/` — PWA dev artifacts (in root .gitignore `**/dev-dist/`)
- `providers/` — Removed (re-exports; import from @digipicks/app-shell)
- `features/` — Removed (types now from @digipicks/shared)

## Production Readiness

- All dependency imports resolve correctly
- No duplicate auth/realtime logic — delegated to app-shell
- Min-side redirects to minside app via `MinsideRedirect`
- Feature gating via `FeatureGate` (reviews, etc.)
