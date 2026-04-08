# Deployment Guide

## CI/CD Overview

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** (`.github/workflows/ci.yml`) | Push to `main`/`develop`, PRs | Lint, typecheck, SDK tests, Convex tests, build verification |
| **Deploy** (`.github/workflows/deploy.yml`) | Push to `main`, manual dispatch | Convex deploy + app builds |
| **A-krav Nightly** (`.github/workflows/a-krav-nightly.yml`) | Daily 02:00 UTC, manual dispatch | Compliance E2E test suite |

## CI Pipeline

PRs trigger four parallel jobs:

1. **Lint & Typecheck** — `pnpm lint` + workspace typechecks
2. **SDK Unit Tests** — `pnpm --filter @digilist-saas/sdk test`
3. **Convex Tests** — `pnpm test:convex` (1,248 component + domain + lib tests)
4. **Convex Deploy Dry-Run** — `npx convex deploy --dry-run` (validates schema + functions without deploying)

After all three test/lint jobs pass, **Build Verification** runs: builds shared, SDK, web, and dashboard apps.

## Deployment Flow

On merge to `main`, the Deploy workflow runs:

1. **deploy-convex** — Deploys Convex schema, functions, and components to production
2. **deploy-apps** — Builds web and dashboard apps (runs after Convex deploy succeeds)

Build artifacts are uploaded for 14 days. Add your hosting deploy step (Vercel, Netlify, Cloudflare Pages) in the `deploy-apps` job — see the commented example in the workflow.

### Manual Deploy

Trigger the Deploy workflow manually from GitHub Actions with environment selection (production/staging).

## Required GitHub Secrets

| Secret | Where to get it | Used by |
|--------|----------------|---------|
| `CONVEX_DEPLOY_KEY` | Convex Dashboard → Settings → Deploy keys | CI dry-run, Deploy |
| `VITE_CONVEX_URL` | Convex Dashboard → Settings → URL | Deploy (app builds) |
| `VITE_SENTRY_DSN` | Sentry project settings (optional) | Deploy (app builds) |

### GitHub Variables (non-secret)

| Variable | Example | Used by |
|----------|---------|---------|
| `VITE_PLATFORM_NAME` | `Xala Foundation` | Deploy (app builds) |

## Pre-commit Hooks

Husky + lint-staged runs Prettier on staged files before every commit.

Setup (one-time after `pnpm install`):
```bash
# Husky installs automatically via the `prepare` script
pnpm install
```

The hook runs `npx lint-staged`, which formats `*.{ts,tsx,js,jsx,mjs,json,md,yml,yaml,css}` with Prettier.

## Branch Protection Rules (Recommended)

Configure these on the `main` branch in GitHub → Settings → Branches → Branch protection rules:

| Rule | Setting |
|------|---------|
| **Require pull request reviews** | 1 approval minimum |
| **Require status checks to pass** | `Lint & Typecheck`, `SDK Unit Tests`, `Convex Tests`, `Convex Deploy Dry-Run`, `Build` |
| **Require branches to be up to date** | Enabled |
| **Restrict who can push** | Only via PR merge |
| **Do not allow bypassing** | Enabled (even for admins) |
| **Require linear history** | Recommended (squash merges) |

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Run `npx convex dev` — this sets `CONVEX_DEPLOYMENT` and creates your dev backend
3. Fill in `VITE_CONVEX_URL` from the Convex dashboard
4. Run `pnpm dev` to start all services

See `.env.example` for the full list of environment variables and where to get them.

## Convex-Specific Notes

- **Schema changes** are forward-only. Prefer additive changes (new fields optional, new tables).
- `npx convex deploy --dry-run` catches schema/function errors before they hit production.
- Component registration happens in `convex/convex.config.ts` — adding a new component requires a deploy.
- Convex environment variables (backend secrets like Stripe keys) are set in the Convex Dashboard, not in `.env.local`.
