# DigilistSaaS Registry — Dictionary, Gazetteer & Gatekeeper

The registry is the **authoritative reference** for components, patterns, standards, and reusability in DigilistSaaS. It serves as:

- **Dictionary** — Maps terms, intents, and raw HTML → canonical components
- **Gazetteer** — Index of all components, patterns, guidelines, and providers
- **Gatekeeper** — Non-negotiable rules for AI agents and developers
- **Guided tour** — Onboarding pathways and decision flows

**AI coding agents and developers must consult this before generating or modifying UI, auth, or infrastructure code.**

---

## Quick start

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
} from '@digilist-saas/ds/registry';

// "I need a button" → { component: 'button', source: '@digilist-saas/ds' }
resolveNeed('button');

// Get component metadata
getComponent('dataTable');

// Check gatekeeper rules
// PROHIBITIONS — never do these
// REQUIREMENTS — always do these
// DECISION_FLOWS — when X, do Y
```

---

## For AI agents

**Read first:** `AGENT_GUIDE.md` in this directory.

1. Before adding UI → use `resolveNeed()`, `components`, `getComponent()`
2. Before auth/realtime → check `PROHIBITIONS`; use `@digilist-saas/app-shell` only
3. Before raw HTML → use DS components (see `DS_COMPONENT_DICTIONARY`)
4. Before styles → use `.module.css` and `--ds-*` tokens

---

## For developers

1. **Onboarding:** `CLAUDE.md` → `AGENT_GUIDE.md` → this registry
2. **New app:** `docs/planning/CLI_APP_GENERATOR_PLAN.md` + provider stack
3. **Component lookup:** `import { components } from '@digilist-saas/ds/registry'`
4. **Standards:** guidelines (`sharedInfrastructure`, `cssModules`)

---

## Structure

| File | Purpose |
|------|---------|
| `AGENT_GUIDE.md` | Gatekeeper rules, decision flows, guided tour |
| `registry.json` | Components, patterns, examples, guidelines |
| `gatekeeper.ts` | PROHIBITIONS, REQUIREMENTS, DECISION_FLOWS |
| `gazetteer.ts` | GAZETTEER_INDEX, resolveNeed() |
| `providers.ts` | Provider stack documentation |

---

## Related

- `scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md` — HTML → DS mapping, nb terminology
- `docs/SHARED_INFRASTRUCTURE.md` — Auth, realtime, RBAC
- `CLAUDE.md` — Project overview
