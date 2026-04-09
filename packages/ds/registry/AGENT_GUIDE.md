# DigilistSaaS Registry — Agent & Developer Guide

> **Purpose:** This registry is the **dictionary**, **gazetteer**, and **gatekeeper** for DigilistSaaS standards, components, and reusability. AI coding agents and developers MUST consult this before generating or modifying UI, auth, or infrastructure code.
>
> **Audience:** AI coding assistants (Cursor, Copilot, Claude, etc.) and human developers.

---

## 1. What This Is

| Role            | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| **Dictionary**  | Maps terms, raw HTML, and intents → canonical components and patterns |
| **Gazetteer**   | Index of all components, patterns, guidelines, providers, and rules   |
| **Gatekeeper**  | Non-negotiable rules; violations block approval                       |
| **Guided tour** | Step-by-step pathways for onboarding and decision-making              |

---

## 2. Start Here (Guided Tour)

### For AI Agents

1. **Before adding UI:** Query `@digipicks/ds/registry` for components. Use `resolveNeed()`, `components`, or `getComponent()`.
2. **Before implementing auth/realtime:** Check `PROHIBITIONS` and `REQUIREMENTS` in gatekeeper. Use `@digipicks/app-shell` only.
3. **Before using raw HTML:** Check `DS_COMPONENT_DICTIONARY` (scripts/eslint-rules/). Use DS components.
4. **Before adding styles:** Use `.module.css` and design tokens. No hardcoded colors or px.

### For Developers

1. **New to the codebase?** Read `CLAUDE.md` first, then this guide.
2. **Building a new app?** See `docs/planning/CLI_APP_GENERATOR_PLAN.md` and provider stack in `@digipicks/ds/registry`.
3. **Adding a component?** Check if it exists: `import { components } from '@digipicks/ds/registry'`.
4. **Styling?** Use `.module.css`, `--ds-*` tokens. See guideline `cssModules`.

---

## 3. Gatekeeper Rules (Non-Negotiable)

### Prohibitions — NEVER

| ID                      | Rule                                           | Use Instead                                                  |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `no-app-local-auth`     | No app-local AuthProvider, useAuth             | `@digipicks/app-shell`                                       |
| `no-app-local-realtime` | No custom realtime providers                   | `RealtimeProvider` / `ConvexRealtimeProvider` from app-shell |
| `no-direct-digdir`      | No `@digdir/*` imports in apps                 | `@digipicks/ds`                                              |
| `no-raw-html`           | No raw `<button>`, `<input>`, `<table>` for UI | Button, Textfield, DataTable from `@digipicks/ds`            |
| `no-inline-svg`         | No inline `<svg>`                              | Icon components from `@digipicks/ds`                         |
| `no-plain-css`          | No plain `.css` for component styles           | `.module.css`                                                |
| `no-hardcoded-colors`   | No rgb/rgba/hex in styles                      | `--ds-color-*` tokens                                        |
| `no-hardcoded-pixels`   | No `px` for spacing in inline styles           | `--ds-size-*` tokens                                         |

### Requirements — ALWAYS

| ID                    | Rule                                             |
| --------------------- | ------------------------------------------------ |
| `import-ui-from-ds`   | Import UI from `@digipicks/ds`                   |
| `import-styles-once`  | Import `@digipicks/ds/styles` once in main.tsx   |
| `use-theme-base`      | Import `@digipicks/ds/platform-base`             |
| `auth-from-app-shell` | Use AuthProvider/useAuth from app-shell for auth |
| `use-module-css`      | Use `.module.css` for component styles           |
| `i18n-user-facing`    | Use `t()` for all user-facing strings            |

---

## 4. Decision Flows — When X, Do Y

| Need                    | Use                                                          |
| ----------------------- | ------------------------------------------------------------ |
| Auth (user must log in) | `AuthProvider` + `ProtectedRoute` from app-shell             |
| Auth (backoffice admin) | `BackofficeAuthBridge` + `BackofficeProtectedRouteConnected` |
| Button                  | `<Button>` from `@digipicks/ds`                              |
| Button as link          | `<Button asChild><a href="...">`                             |
| Text input              | `<Textfield>` or `<Field><Field.Input>`                      |
| Dropdown select         | `<Select>` or `<NativeSelect>`                               |
| Confirmation dialog     | `useDialog().confirm()` + `ConfirmDialog`                    |
| Data table              | `<DataTable>` from `@digipicks/ds`                           |
| Side panel / filters    | `<Drawer>` or `<FilterDrawer>`                               |
| Page layout             | `ContentLayout`, `ContentSection`, `PageHeader`              |
| Dashboard shell         | `DashboardLayout` from app-shell                             |

---

## 5. Programmatic Access (for AI Tools)

```typescript
import {
  components,
  patterns,
  guidelines,
  getComponent,
  searchRegistry,
  providers,
  PROHIBITIONS,
  REQUIREMENTS,
  DECISION_FLOWS,
  GAZETTEER_INDEX,
  resolveNeed,
} from '@digipicks/ds/registry';

// Gazetteer namespace (if exported separately)
import { providers as providerModule } from '@digipicks/ds/registry';

// Resolve "I need a button" → { component: 'button', source: '@digipicks/ds' }
const result = resolveNeed('button');

// Check if a component exists
const info = getComponent('dataTable');

// List all prohibitions before generating code
// PROHIBITIONS, REQUIREMENTS, DECISION_FLOWS
```

---

## 6. File Index (Gazetteer)

| File                                              | Contents                                          |
| ------------------------------------------------- | ------------------------------------------------- |
| `registry.json`                                   | Components, patterns, examples, guidelines (JSON) |
| `registry.ts`                                     | Query utilities, type-safe access                 |
| `components.ts`                                   | Full TypeScript component registry                |
| `patterns.ts`                                     | UI pattern registry                               |
| `guidelines.ts`                                   | Standards and best practices                      |
| `providers.ts`                                    | Provider stack documentation                      |
| `gatekeeper.ts`                                   | PROHIBITIONS, REQUIREMENTS, DECISION_FLOWS        |
| `gazetteer.ts`                                    | GAZETTEER_INDEX, resolveNeed()                    |
| `scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md` | HTML → DS mapping, nb terminology                 |

---

## 7. References

- `CLAUDE.md` — Project overview, commands, architecture
- `docs/SHARED_INFRASTRUCTURE.md` — Auth, realtime, RBAC sources
- `docs/CONVENTIONS.md` — Tenant, errors, audit
- `docs/SECURITY_INVARIANTS.md` — Non-negotiable security
- `scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md` — Component vocabulary (nb/en)
