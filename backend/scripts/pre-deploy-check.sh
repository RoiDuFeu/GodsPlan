#!/bin/bash

################################################################################
# 🔍 Pre-Deploy Health Check
#
# Validates that the Google Maps scraper fix is ready for deployment
#
# Usage:
#   ./scripts/pre-deploy-check.sh
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🔍 Pre-Deploy Health Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
  echo -e "${GREEN}✅ $1${NC}"
  ((PASSED++))
}

check_fail() {
  echo -e "${RED}❌ $1${NC}"
  ((FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARNINGS++))
}

echo -e "${BLUE}📦 Checking environment...${NC}"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  check_pass "Node.js installed: $NODE_VERSION"
else
  check_fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  check_pass "npm installed: $NPM_VERSION"
else
  check_fail "npm not found"
fi

# Check TypeScript
if command -v npx &> /dev/null && npx tsc --version &> /dev/null; then
  TSC_VERSION=$(npx tsc --version)
  check_pass "TypeScript installed: $TSC_VERSION"
else
  check_warn "TypeScript not found (may be OK if using tsx)"
fi

echo ""
echo -e "${BLUE}📁 Checking files...${NC}"
echo ""

# Check required files
FILES=(
  "src/scrapers/GoogleMapsScraper.ts"
  "src/scrapers/test-google-cookies-fix.ts"
  "GOOGLE_MAPS_CONSENT_FIX.md"
  "DEPLOYMENT_GUIDE.md"
  "FIX_SUMMARY.md"
  "QUICK_START.md"
  "scripts/scrape-all-churches.sh"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "Found: $file"
  else
    check_fail "Missing: $file"
  fi
done

echo ""
echo -e "${BLUE}🔍 Checking scraper code...${NC}"
echo ""

# Check if consent bypass methods exist
if grep -q "bypassConsentWithCookies" src/scrapers/GoogleMapsScraper.ts; then
  check_pass "Found: bypassConsentWithCookies() method"
else
  check_fail "Missing: bypassConsentWithCookies() method"
fi

if grep -q "tryDismissConsentBanner" src/scrapers/GoogleMapsScraper.ts; then
  check_pass "Found: tryDismissConsentBanner() method"
else
  check_fail "Missing: tryDismissConsentBanner() method"
fi

if grep -q "CONSENT.*YES" src/scrapers/GoogleMapsScraper.ts; then
  check_pass "Found: CONSENT cookie injection"
else
  check_fail "Missing: CONSENT cookie injection"
fi

if grep -q "SOCS" src/scrapers/GoogleMapsScraper.ts; then
  check_pass "Found: SOCS cookie injection"
else
  check_fail "Missing: SOCS cookie injection"
fi

echo ""
echo -e "${BLUE}🧪 Running quick test...${NC}"
echo ""

# Run the test suite
if npx tsx src/scrapers/test-google-cookies-fix.ts 2>&1 | tee /tmp/scraper-test-output.log | grep -q "🎉 PERFECT"; then
  check_pass "Test suite passed (5/5 churches)"
  
  # Check specific metrics
  SUCCESS_COUNT=$(grep -c "✅ SUCCESS" /tmp/scraper-test-output.log || echo "0")
  PHOTO_COUNT=$(grep "Total photos scraped:" /tmp/scraper-test-output.log | grep -oE "[0-9]+" || echo "0")
  BLOCKED_COUNT=$(grep "Consent blocked:" /tmp/scraper-test-output.log | grep -oE "[0-9]+/[0-9]+" | cut -d'/' -f1 || echo "0")
  
  echo ""
  echo "  📊 Metrics:"
  echo "     Successful scrapes: $SUCCESS_COUNT"
  echo "     Photos scraped: $PHOTO_COUNT"
  echo "     Consent blocks: $BLOCKED_COUNT"
  echo ""
  
  if [ "$SUCCESS_COUNT" == "5" ]; then
    check_pass "All 5 churches scraped successfully"
  else
    check_warn "Only $SUCCESS_COUNT/5 churches succeeded"
  fi
  
  if [ "$PHOTO_COUNT" -ge "30" ]; then
    check_pass "Good photo count: $PHOTO_COUNT photos"
  else
    check_warn "Low photo count: $PHOTO_COUNT photos (expected ~40)"
  fi
  
  if [ "$BLOCKED_COUNT" == "0" ]; then
    check_pass "Zero consent blocks"
  else
    check_fail "Consent blocking detected: $BLOCKED_COUNT"
  fi
  
else
  check_fail "Test suite failed"
  echo ""
  echo -e "${RED}Test output:${NC}"
  tail -20 /tmp/scraper-test-output.log
  echo ""
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo ""

# Final verdict
if [ $FAILED -eq 0 ]; then
  if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}🎉 READY FOR DEPLOYMENT!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo -e "${GREEN}All checks passed. You can now:${NC}"
    echo ""
    echo "  1. Deploy to production:"
    echo "     git add . && git commit -m '🚀 Fix Google Maps consent' && git push"
    echo ""
    echo "  2. Run small batch test:"
    echo "     ./scripts/scrape-all-churches.sh --limit 10"
    echo ""
    echo "  3. If successful, run full scrape:"
    echo "     ./scripts/scrape-all-churches.sh"
    echo ""
    exit 0
  else
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}⚠️  READY WITH WARNINGS${NC}"
    echo -e "${YELLOW}======================================${NC}"
    echo ""
    echo -e "${YELLOW}Some warnings detected, but deployment is OK.${NC}"
    echo -e "${YELLOW}Review warnings above.${NC}"
    echo ""
    exit 0
  fi
else
  echo -e "${RED}======================================${NC}"
  echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
  echo -e "${RED}======================================${NC}"
  echo ""
  echo -e "${RED}$FAILED critical checks failed.${NC}"
  echo -e "${RED}Fix the issues above before deploying.${NC}"
  echo ""
  exit 1
fi
