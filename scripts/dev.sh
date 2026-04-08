#!/bin/bash
# DigilistSaaS Local Development Environment
#
# Usage: ./scripts/dev.sh [command]
# Commands:
#   start  - Start Convex dev server and watch mode
#   seed   - Seed demo data
#   test   - Run all tests
#   logs   - Tail Convex logs

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# COMMANDS
# =============================================================================

cmd_start() {
    log_info "Starting DigilistSaaS development environment..."

    cd "$PROJECT_DIR"

    # Start Convex dev server
    log_info "Starting Convex dev server..."
    npx convex dev &

    # Start SDK watcher
    log_info "Starting SDK watcher..."
    cd "$PROJECT_DIR/packages/sdk"
    npm run dev &

    wait
}

cmd_seed() {
    log_info "Seeding demo data..."
    cd "$PROJECT_DIR"
    npx convex run seeds:seedAll
    log_info "Demo data seeded."
}

cmd_test() {
    log_info "Running tests..."
    cd "$PROJECT_DIR"

    # SDK unit tests
    log_info "SDK unit tests..."
    cd packages/sdk
    npm test

    log_info "All tests passed!"
}

cmd_logs() {
    log_info "Tailing Convex logs..."
    cd "$PROJECT_DIR"
    npx convex logs
}

cmd_codegen() {
    log_info "Running codegen..."
    cd "$PROJECT_DIR"
    npx ts-node scripts/codegen.ts --all
    log_info "Codegen complete."
}

cmd_help() {
    echo "DigilistSaaS Development CLI"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start    Start Convex dev server and watch mode"
    echo "  seed     Seed demo data"
    echo "  test     Run all tests"
    echo "  logs     Tail Convex logs"
    echo "  codegen  Run codegen for SDK/OpenAPI/docs"
    echo "  help     Show this help"
    echo ""
}

# =============================================================================
# MAIN
# =============================================================================

COMMAND="${1:-help}"

case "$COMMAND" in
    start)   cmd_start ;;
    seed)    cmd_seed ;;
    test)    cmd_test ;;
    logs)    cmd_logs ;;
    codegen) cmd_codegen ;;
    help)    cmd_help ;;
    *)
        log_error "Unknown command: $COMMAND"
        cmd_help
        exit 1
        ;;
esac
