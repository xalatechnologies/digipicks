# Web App — Thin App Cleanup: Move to Shared Packages

This document identifies everything in `apps/web` that should move to shared packages (digilist, app-shell, @digilist-saas/ds) to achieve a true thin app.

---

## Current State (What Web Has Today)

| Folder | Contents | Shared Source | Action |
|--------|----------|---------------|--------|
| **components/** | SkipLinks, PaymentStatusBadge, RealtimeToast, SentryTestComponent | @digilist-saas/ds, @digilist-saas/ds, (custom), (dev) | See below |
| **features/listing-details/** | types.ts, index.ts, components/index.ts | @digilist-saas/shared, (re-exports), digilist | See below |
| **hooks/** | useAuth.ts | App-shell adapter | See below |
| **providers/** | AltinnProvider, AccessibilityMonitoringProvider | Re-exports from app-shell | Remove entirely |

---

## 1. Components

### 1.1 SkipLinks — REMOVE (redundant)

- **Web**: `components/SkipLinks.tsx` — re-exports from `@digilist-saas/ds`
- **App.tsx** already imports SkipLinks from `@digilist-saas/ds` (line 13)
- **Tests**: `SkipLinks.test.tsx` imports from `@/components/SkipLinks`

**Action**: Delete `components/SkipLinks.tsx`. Update `SkipLinks.test.tsx` to import from `@digilist-saas/ds`. Remove from `components/index.ts`.

### 1.2 PaymentStatusBadge — REMOVE (redundant)

- **Web**: `components/PaymentStatusBadge.tsx` — re-exports from `@digilist-saas/ds`
- **Usage**: No file in web imports PaymentStatusBadge from `@/components`; digilist imports from `@digilist-saas/ds`

**Action**: Delete `components/PaymentStatusBadge.tsx`. Remove from `components/index.ts`.

### 1.3 RealtimeToast — MOVE to app-shell

- **Web**: `components/RealtimeToast.tsx` — custom component
- **Dependencies**: `useRealtimeBooking`, `useRealtimeNotification`, `useRealtimeStatus` from `@digilist-saas/app-shell`
- **Usage**: App.tsx imports `RealtimeToast` from `@/components`

**Action**: Move to `packages/app-shell/src/components/RealtimeToast.tsx`. Export from app-shell. Web imports from `@digilist-saas/app-shell`.

### 1.4 SentryTestComponent — REMOVE or KEEP (dev only)

- **Web**: `components/SentryTestComponent.tsx` — test panel for Sentry
- **Usage**: Not imported anywhere in App.tsx (may be conditionally rendered or removed)
- **Note**: File says "Remove before production"

**Action**: Delete if unused. If used for local dev/testing, move to `packages/app-shell` as optional dev component, or keep in web as the single dev-only exception.

---

## 2. Features (listing-details)

### 2.1 features/listing-details/types.ts — FLATTEN

- **Current**: Re-exports from `@digilist-saas/shared` + app-specific types (`ListingDetailsI18n`, `ListingHeaderProps`, `TabsProps`, `SidebarProps`)
- **Usage**: `ListingDetailPage.tsx` imports types from `@/features/listing-details`

**Action**:
1. Add `ListingDetailsI18n`, `ListingHeaderProps`, `TabsProps`, `SidebarProps` to `@digilist-saas/shared` if reusable by minside/backoffice, or keep in digilist if listing-specific.
2. Update `ListingDetailPage.tsx` to import directly:
   - From `@digilist-saas/shared`: `Listing`, `ListingType`, `BookingMode`, etc.
   - From `@digilist-saas/digilist/listings`: `ListingHeaderProps`, etc. (if they belong there)
3. Delete `features/listing-details/` folder.

### 2.2 features/listing-details/components/index.ts — REMOVE (dead)

- **Current**: Re-exports `ListingHeader`, `KeyFactsRow`, etc. from `@digilist-saas/digilist/listings`
- **Usage**: No imports from `@/features/listing-details/components` anywhere

**Action**: Delete. Already dead code.

---

## 3. Hooks (useAuth)

### 3.1 useAuth — EXTEND app-shell or KEEP adapter

- **Web**: `hooks/useAuth.ts` — adapter over app-shell `useAuth`
- **Provides**: `login(provider)`, `checkRole(role)`, `WebUser`, etc. — web-specific API
- **App-shell**: Has `signInWithOAuth`, `signOut`, `user`, `isAuthenticated`, etc.

**Options**:

**A) Extend app-shell useAuth** (preferred for thin app):
- Add optional `login` alias for `signInWithOAuth`
- Add `checkRole(role)` to app-shell (or derive from `useRBAC`)
- Add `WebUser` / extend `User` type in app-shell with `tenantId`, `role`
- Web imports `useAuth` from `@digilist-saas/app-shell` directly.

**B) Keep adapter** (minimal change):
- Keep `hooks/useAuth.ts` as a thin adapter. Document that it's the only acceptable app-level hook — all others from app-shell/SDK.

---

## 4. Providers — REMOVE entirely

- **Web**: `providers/AltinnProvider.tsx`, `providers/AccessibilityMonitoringProvider.tsx` — both re-export from `@digilist-saas/app-shell`
- **Usage**: No file in web imports from `@/providers`

**Action**:
1. Delete `providers/` folder.
2. Any future usage: import directly from `@digilist-saas/app-shell`.

---

## 5. Target Structure (After Cleanup)

```
apps/web/src/
├── App.tsx
├── main.tsx
├── root.css
├── routes/              # ListingsPage, ListingDetailPage, login, auth-callback, etc.
├── test-setup.ts       # Vitest setup (jest-dom)
└── vite-env.d.ts
```

**Removed**:
- `components/` (except tests moved or deleted)
- `features/`
- `hooks/` (if useAuth moves to app-shell)
- `providers/`

**Imports after cleanup**:
- `SkipLinks`, `AppHeader`, etc. → `@digilist-saas/ds`
- `RealtimeToast` → `@digilist-saas/app-shell`
- `useAuth` → `@digilist-saas/app-shell` (after extending)
- Types for ListingDetailPage → `@digilist-saas/shared` + `@digilist-saas/digilist`
- `AuthProvider`, `RealtimeProvider`, `ThemeProvider`, `env` → `@digilist-saas/app-shell`

---

## 6. Recommended Execution Order

1. **Remove dead code**: `features/listing-details/components/`, `providers/` (unused), `PaymentStatusBadge`, `SkipLinks` re-exports
2. **Move RealtimeToast** to app-shell
3. **Flatten features**: Update ListingDetailPage to import types from shared/digilist; delete features/
4. **Extend app-shell useAuth** or document adapter as exception
5. **Remove SentryTestComponent** if unused, or keep as single dev exception

---

## 7. Compatibility Notes

- **E2E / tests**: Update any imports from `@/components`, `@/hooks`, `@/providers`, `@/features`
- **Digilist**: Already uses `@digilist-saas/ds` for PaymentStatusBadge, SkipLinks; no changes needed
- **Minside / Backoffice**: If they import from web's providers, switch to `@digilist-saas/app-shell`
