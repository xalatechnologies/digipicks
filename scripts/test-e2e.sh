#!/usr/bin/env bash
set -euo pipefail
# =============================================================================
# A-krav E2E Test Runner — CI/CD Pipeline Script
#
# Usage:
#   ./scripts/test-e2e.sh smoke          # PR lane: @smoke tests only (~2 min)
#   ./scripts/test-e2e.sh all            # Nightly: full A-krav suite (~15 min)
#   ./scripts/test-e2e.sh pack           # Generate evidence ZIP for tender
#   ./scripts/test-e2e.sh suite-a        # Run specific suite
#
# Environment:
#   TEST_BASE_URL        — Web app URL (default: http://localhost:5190)
#   TEST_BACKOFFICE_URL  — Backoffice URL (default: http://localhost:5175)
#   TEST_MINSIDE_URL     — Minside URL (default: http://localhost:5174)
#   E2E_SKIP_SEED        — Skip seeding (default: false)
#   CI                   — Set by CI runner (enables video recording)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EVIDENCE_DIR="$PROJECT_ROOT/evidence"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[E2E]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; }

# =============================================================================
# FUNCTIONS
# =============================================================================

seed_e2e_data() {
    if [ "${E2E_SKIP_SEED:-false}" = "true" ]; then
        warn "Skipping E2E seed (E2E_SKIP_SEED=true)"
        return 0
    fi

    log "Seeding E2E test data..."
    npx convex run seeds/seedE2E:seedE2E '{}' 2>&1 || {
        warn "Seed failed — tests may run against existing data"
    }
    ok "E2E seed complete"
}

run_smoke() {
    log "Running smoke tests (@smoke tag)..."
    npx playwright test tests/e2e/a-krav/ \
        --grep "@smoke" \
        --reporter=html,json \
        --output="$EVIDENCE_DIR/results" \
        ${CI:+--retries=1} \
        "$@"
}

run_all() {
    log "Running full A-krav suite..."
    npx playwright test tests/e2e/a-krav/ \
        --reporter=html,json \
        --output="$EVIDENCE_DIR/results" \
        ${CI:+--retries=2} \
        ${CI:+--workers=2} \
        "$@"
}

run_suite() {
    local suite="$1"
    shift
    log "Running suite: $suite"
    npx playwright test "tests/e2e/a-krav/suite-${suite}-*.spec.ts" \
        --reporter=html,json \
        --output="$EVIDENCE_DIR/results" \
        "$@"
}

pack_evidence() {
    log "Packaging evidence for tender submission..."

    # Ensure evidence directory exists
    mkdir -p "$EVIDENCE_DIR"/{screenshots,exports,audit-logs,results,reports}

    # Run full suite first if results don't exist
    if [ ! -d "$EVIDENCE_DIR/results" ] || [ -z "$(ls "$EVIDENCE_DIR/results" 2>/dev/null)" ]; then
        run_all
    fi

    # Generate traceability report
    log "Generating traceability report..."
    if [ -f "$PROJECT_ROOT/tests/a-krav/A-KRAV-TRACEABILITY.md" ]; then
        cp "$PROJECT_ROOT/tests/a-krav/A-KRAV-TRACEABILITY.md" "$EVIDENCE_DIR/A-KRAV-TRACEABILITY.md"
    fi

    if [ -f "$PROJECT_ROOT/tests/a-krav/A-KRAV-TRACEABILITY.json" ]; then
        cp "$PROJECT_ROOT/tests/a-krav/A-KRAV-TRACEABILITY.json" "$EVIDENCE_DIR/A-KRAV-TRACEABILITY.json"
    fi

    # Copy Playwright HTML report
    if [ -d "playwright-report" ]; then
        cp -r playwright-report "$EVIDENCE_DIR/playwright-report"
    fi

    # Generate summary
    cat > "$EVIDENCE_DIR/EVIDENCE-SUMMARY.md" <<EOF
# A-krav E2E Test Evidence Pack

**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Platform:** DigiList Commerce v1.0
**Environment:** ${CI:+CI/CD Pipeline}${CI:-Local Development}

## Contents

| Directory | Description |
|---|---|
| \`screenshots/\` | Visual evidence captures from all test suites |
| \`exports/\` | CSV/PDF exports captured during report tests |
| \`audit-logs/\` | Audit log JSON captures |
| \`results/\` | Playwright JSON test results |
| \`playwright-report/\` | Interactive HTML test report |
| \`A-KRAV-TRACEABILITY.md\` | Requirement-to-test mapping |

## Test Suites

| Suite | A-krav | Tests |
|---|---|---|
| A: RBAC | A-1.1–A-1.6 | 9 |
| B: Events & Publishing | A-2.1–A-2.4 | 4 |
| C: Inventory & Seats | A-3.1–A-3.3 | 3 |
| D: Checkout & Payments | A-4.1–A-4.4 | 4 |
| E: Gift Cards | A-5.1–A-5.2 | 2 |
| F: Membership | A-6.1–A-6.3 | 3 |
| G: Resale & Transfer | A-7.1–A-7.3 | 3 |
| H: Scanning & Entry | A-8.1–A-8.4 | 4 |
| I: Reporting & Export | A-9.1–A-9.3 | 3 |
| J: Channels | A-10.1–A-10.3 | 3 |
| K: Accessibility | A-11.1 | 1 |
| **Total** | | **39** |

## Verification

To reproduce these results:
\`\`\`bash
source .env.test
./scripts/test-e2e.sh all
\`\`\`
EOF

    # Create ZIP archive
    local zip_name="digilist-e2e-evidence-${TIMESTAMP}.zip"
    log "Creating evidence ZIP: $zip_name"

    (cd "$EVIDENCE_DIR" && zip -r "$PROJECT_ROOT/$zip_name" . \
        -x "*.DS_Store" "*.git*" 2>/dev/null) || {
        # Fallback to tar if zip not available
        tar -czf "$PROJECT_ROOT/${zip_name%.zip}.tar.gz" -C "$EVIDENCE_DIR" .
        zip_name="${zip_name%.zip}.tar.gz"
    }

    ok "Evidence pack created: $zip_name"
    log "Size: $(du -sh "$PROJECT_ROOT/$zip_name" | cut -f1)"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    local mode="${1:-smoke}"
    shift 2>/dev/null || true

    log "═══════════════════════════════════════════════"
    log "  DigiList A-krav E2E Test Runner"
    log "  Mode: $mode"
    log "  Time: $(date)"
    log "═══════════════════════════════════════════════"

    # Seed data
    seed_e2e_data

    case "$mode" in
        smoke)
            run_smoke "$@"
            ;;
        all|full|nightly)
            run_all "$@"
            ;;
        pack|evidence|zip)
            pack_evidence
            ;;
        suite-*)
            local suite_letter="${mode#suite-}"
            run_suite "$suite_letter" "$@"
            ;;
        reset)
            log "Resetting E2E data..."
            npx convex run seeds/seedE2E:resetE2E '{}'
            ok "E2E data reset"
            ;;
        *)
            err "Unknown mode: $mode"
            echo ""
            echo "Usage: $0 {smoke|all|pack|suite-a|suite-b|...|reset}"
            exit 1
            ;;
    esac

    ok "Done! Mode: $mode"
}

main "$@"
