# @digilist-saas/app-shell

Shared app infrastructure for DigilistSaaS applications. **Auth, realtime, RBAC, and feature flags must come from this package** — do not implement these in app-local code.

## Canonical Exports

| Concern | Exports |
|---------|---------|
| **Auth** | `AuthProvider`, `useAuth` |
| **Realtime** | `RealtimeProvider`, `useRealtimeListingUpdates`, `useRealtimeBooking`, `useRealtimeNotification`, etc. |
| **RBAC** | `useRBAC`, `ROLE_CAPABILITIES`, `getCapabilitiesForRole` — apps use `ProtectedRoute`/`BackofficeProtectedRouteConnected` |
| **Feature flags** | `FeatureGate` |
| **Guards** | `RequireAuth`, `ProtectedRoute` |
| **Layout** | `AppLayout`, `DigdirLayout`, `GlobalSearch`, `PlatformSidebar` |
| **Env** | `env` (typed VITE_* with defaults) |

## Usage

```tsx
import {
  AuthProvider,
  useAuth,
  RealtimeProvider,
  useRealtimeListingUpdates,
  FeatureGate,
  RequireAuth,
} from '@digilist-saas/app-shell';

// Wrap app with providers
<AuthProvider appId="web">
  <RealtimeProvider autoConnect>
    <App />
  </RealtimeProvider>
</AuthProvider>

// Consume in components
const { user, isAuthenticated, signOut } = useAuth();
useRealtimeListingUpdates(listingId, onUpdate);
```

See `docs/SHARED_INFRASTRUCTURE.md` for architecture and migration notes.
