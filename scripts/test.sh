#!/usr/bin/env bash
# =============================================================================
# DigilistSaaS Test Runner
# =============================================================================
#
# Unified test runner that loads environment and runs tests.
#
# Usage:
#   ./scripts/test.sh all      # Run all tests
#   ./scripts/test.sh contracts # Run contract tests
#   ./scripts/test.sh e2e      # Run E2E tests
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cmd="${1:-all}"

# =============================================================================
# Load environment
# =============================================================================
load_env() {
  if [ -f "$ROOT_DIR/.env.test" ]; then
    set -a
    source "$ROOT_DIR/.env.test"
    set +a
    echo -e "${GREEN}✓ Loaded .env.test${NC}"
  else
    echo -e "${YELLOW}⚠ No .env.test found. Run: ./scripts/setup-local.sh${NC}"
  fi
}

# =============================================================================
# Test runners
# =============================================================================
run_contracts() {
  echo ""
  echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE} Contract Tests${NC}"
  echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
  echo ""

  npx vitest run tests/contracts/ --reporter=verbose
}

run_e2e() {
  echo ""
  echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE} E2E Journey Tests${NC}"
  echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
  echo ""

  npx playwright test tests/e2e
}

# =============================================================================
# Main
# =============================================================================
cd "$ROOT_DIR"

load_env

case "$cmd" in
  all)
    run_contracts
    run_e2e
    ;;
  contracts)
    run_contracts
    ;;
  e2e)
    run_e2e
    ;;
  *)
    echo "Usage: ./scripts/test.sh [all|contracts|e2e]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} Done: $cmd${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
