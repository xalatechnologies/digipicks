#!/bin/bash
# =============================================================================
# Scan for Secret Key Leakage
# =============================================================================
# Ensures sensitive keys are not referenced in client packages
# or exposed in non-server code.
#
# Run: ./scripts/scan-secrets-usage.sh
# Exit: 0 if safe, 1 if potential leakage found
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Scanning for secret key usage..."
echo ""

# Define what we're looking for
SECRETS=(
    "SERVICE_ROLE"
    "serviceRoleKey"
)

# Directories that SHOULD NOT contain secret references
CLIENT_DIRS=(
    "packages/sdk/src"
    "apps"
    "frontend"
    "client"
    "web"
    "mobile"
)

# Directories that are ALLOWED to use service role
ALLOWED_DIRS=(
    "convex"
    "scripts"
    "tests"
    ".github"
    "server"
    "api"
)

VIOLATIONS=0

# Function to check for violations
check_directory() {
    local dir=$1
    local secret=$2

    if [ -d "$dir" ]; then
        # Search for the secret pattern
        local matches=$(grep -r --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
            -l "$secret" "$dir" 2>/dev/null || true)

        if [ -n "$matches" ]; then
            echo -e "${RED}VIOLATION: Found '$secret' in client code:${NC}"
            echo "$matches" | while read -r file; do
                echo "   - $file"
                # Show the line numbers
                grep -n "$secret" "$file" 2>/dev/null | head -3 | while read -r line; do
                    echo "     $line"
                done
            done
            VIOLATIONS=$((VIOLATIONS + 1))
        fi
    fi
}

# Check each client directory for each secret
for dir in "${CLIENT_DIRS[@]}"; do
    for secret in "${SECRETS[@]}"; do
        check_directory "$dir" "$secret"
    done
done

echo ""

# Check for hardcoded keys (any JWT-looking strings that might be keys)
echo "Scanning for hardcoded JWT-like strings..."

HARDCODED=$(grep -rE 'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.' \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --include="*.json" \
    . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "test" | grep -v ".git" || true)

if [ -n "$HARDCODED" ]; then
    echo -e "${YELLOW}WARNING: Found potential hardcoded JWT tokens:${NC}"
    echo "$HARDCODED" | head -10
    echo ""
    echo "   Review these files to ensure no secrets are committed."
fi

# Check .env files are gitignored
echo ""
echo "Checking .env files..."

if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}PASS: .env files are in .gitignore${NC}"
    else
        echo -e "${RED}FAIL: .env files are NOT in .gitignore!${NC}"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
else
    echo -e "${YELLOW}WARNING: No .gitignore found${NC}"
fi

# Check if any .env files are tracked
TRACKED_ENV=$(git ls-files | grep "\.env" | grep -v ".example" || true)
if [ -n "$TRACKED_ENV" ]; then
    echo -e "${RED}VIOLATION: .env files are being tracked by git:${NC}"
    echo "$TRACKED_ENV"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check for exposed secrets in package.json scripts
echo ""
echo "Checking package.json for inline secrets..."

PACKAGE_SECRETS=$(grep -rE "(SERVICE_ROLE|API_KEY=)" \
    --include="package.json" . 2>/dev/null | grep -v node_modules || true)

if [ -n "$PACKAGE_SECRETS" ]; then
    echo -e "${RED}VIOLATION: Found secrets in package.json:${NC}"
    echo "$PACKAGE_SECRETS"
    VIOLATIONS=$((VIOLATIONS + 1))
fi

# Summary
echo ""
echo "==============================================================="

if [ $VIOLATIONS -gt 0 ]; then
    echo -e "${RED}FAILED: Found $VIOLATIONS security violation(s)${NC}"
    echo ""
    echo "Please fix the above issues before committing."
    exit 1
else
    echo -e "${GREEN}PASSED: No secret leakage detected${NC}"
    echo ""
    echo "Secrets are properly isolated to server-side code."
    exit 0
fi
