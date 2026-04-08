# Backoffice — Thin App Cleanup

Backoffice cleanup is phased per `docs/THIN_APPS_CLEANUP_PLAN.md`.

---

## Phase A — Completed ✅

| Item | Action |
|------|--------|
| **components/SentryTestComponent** | Removed — unused |
| **components/shared/** | Simplified — FormSection, FormActions, InfoBox re-export from @digilist-saas/ds |
| **components/shared/StatusBadge** | Removed — unused; consumers use digilist BookingStatusBadge, ListingStatusBadge, PaymentStatusBadge |

## Phase B — Providers (Kept)

Backoffice has custom providers for Convex-reactive auth and backoffice roles:

| Provider | Purpose | Action |
|----------|---------|--------|
| AuthProvider | Convex auth | Keep — extends app-shell for backoffice |
| BackofficeRoleProvider | saksbehandler, admin roles | Keep |
| RealtimeProvider | Convex reactive (not WebSocket) | Keep — different transport than web/minside |

## Phase C — Features (Deferred)

- **features/listings/** — 30+ files: migrate to digilist when aligning types
- **features/calendar/** — EventDrawer, TimelineView: evaluate move to digilist
- **features/reviews/** — Thin wrapper; already uses digilist ReviewModerationPage

## Layout (No Wrappers) ✅

- **DashboardLayout** from `@digilist-saas/digilist/layout` with `variant="backoffice"`
- **BackofficeLayoutBridge** — minimal 5-line bridge in App.tsx (gets useAuth + useBackofficeRole, passes to DashboardLayout)
- Nav config in `@digilist-saas/shared` (`DASHBOARD_NAV_CONFIG`)

## Current Structure

```
apps/backoffice/src/
├── App.tsx
├── main.tsx
├── components/           # App-specific: layout, SearchResults, EditBookingForm, etc.
│   ├── layout/          # AppLayout, Sidebar, BackofficeHeaderSlots (thin wrappers)
│   ├── shared/          # Re-exports FormSection, FormActions, InfoBox from @digilist-saas/ds
│   ├── bookings/
│   ├── organizations/
│   ├── seasons/
│   └── users/
├── features/            # listings, calendar, reviews (Phase C deferred)
├── hooks/               # useAuth, useRBAC, useBackofficeRole, etc.
├── providers/           # AuthProvider, BackofficeRoleProvider, RealtimeProvider
├── routes/
└── routes/
```

## Key Imports

| Need | Import From |
|------|-------------|
| FormSection, FormActions, InfoBox | @/components/shared or @digilist-saas/ds |
| BookingStatusBadge, ListingStatusBadge, PaymentStatusBadge | @digilist-saas/digilist/status |
| Auth, roles | @/providers (custom) |
