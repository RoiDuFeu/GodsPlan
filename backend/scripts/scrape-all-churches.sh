#!/bin/bash

################################################################################
# 🚀 Scrape All Churches - Google Maps Photos
#
# Usage:
#   ./scripts/scrape-all-churches.sh [--dry-run] [--limit N]
#
# Options:
#   --dry-run    Test without actually scraping (shows what would be done)
#   --limit N    Only scrape first N churches (for testing)
#
# Examples:
#   ./scripts/scrape-all-churches.sh --limit 10    # Test on 10 churches
#   ./scripts/scrape-all-churches.sh               # Full scrape (207 churches)
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
LIMIT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}🚀 Google Maps Church Scraper${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if backend directory exists
if [ ! -d "src/scrapers" ]; then
  echo -e "${RED}❌ Error: Must run from backend/ directory${NC}"
  exit 1
fi

# Estimate time
if [ -n "$LIMIT" ]; then
  CHURCH_COUNT=$LIMIT
else
  CHURCH_COUNT=207
fi

ESTIMATED_SECONDS=$((CHURCH_COUNT * 4))  # 3.5s avg + buffer
ESTIMATED_MINUTES=$((ESTIMATED_SECONDS / 60))

echo -e "${YELLOW}Configuration:${NC}"
echo "  Churches to scrape: $CHURCH_COUNT"
echo "  Estimated time: ~${ESTIMATED_MINUTES} minutes"
echo "  Rate limit: 2.5s between requests"
echo "  Max photos per church: 8"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No actual scraping${NC}"
  echo ""
fi

# Confirm before starting (unless dry-run)
if [ "$DRY_RUN" = false ]; then
  echo -e "${YELLOW}⚠️  This will make ${CHURCH_COUNT} requests to Google Maps${NC}"
  echo -e "${YELLOW}   Press Ctrl+C to cancel, or Enter to continue...${NC}"
  read -r
fi

echo ""
echo -e "${GREEN}Starting scrape...${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Timestamp for log file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/scrape_${TIMESTAMP}.log"

echo "Log file: $LOG_FILE"
echo ""

# Run the scraper
if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN]${NC} Would run scraper on $CHURCH_COUNT churches"
  echo -e "${BLUE}[DRY RUN]${NC} Expected photos: ~$((CHURCH_COUNT * 8))"
  echo -e "${GREEN}✅ Dry run completed${NC}"
else
  # TODO: Replace with your actual scraper command
  # This is a placeholder - adapt to your DB/API structure
  
  if [ -n "$LIMIT" ]; then
    echo "Running: npx tsx src/scripts/run-google-scraper.ts --limit $LIMIT"
    npx tsx src/scripts/run-google-scraper.ts --limit "$LIMIT" 2>&1 | tee "$LOG_FILE"
  else
    echo "Running: npx tsx src/scripts/run-google-scraper.ts"
    npx tsx src/scripts/run-google-scraper.ts 2>&1 | tee "$LOG_FILE"
  fi
  
  echo ""
  echo -e "${GREEN}✅ Scraping completed!${NC}"
  echo ""
  
  # Generate summary report
  echo -e "${BLUE}======================================${NC}"
  echo -e "${BLUE}📊 Summary Report${NC}"
  echo -e "${BLUE}======================================${NC}"
  
  SUCCESS_COUNT=$(grep -c "✅ SUCCESS" "$LOG_FILE" || true)
  FAILED_COUNT=$(grep -c "❌ FAILED" "$LOG_FILE" || true)
  BLOCKED_COUNT=$(grep -c "blocked/consent" "$LOG_FILE" || true)
  PHOTO_COUNT=$(grep "📸 Photos:" "$LOG_FILE" | awk '{sum+=$NF} END {print sum}' || echo "0")
  
  echo ""
  echo "Results from: $LOG_FILE"
  echo ""
  echo "  ✅ Successful: $SUCCESS_COUNT"
  echo "  ❌ Failed: $FAILED_COUNT"
  echo "  🚫 Consent blocked: $BLOCKED_COUNT"
  echo "  📸 Total photos: $PHOTO_COUNT"
  
  if [ "$CHURCH_COUNT" -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESS_COUNT * 100 / CHURCH_COUNT))
    AVG_PHOTOS=$((PHOTO_COUNT / CHURCH_COUNT))
    
    echo ""
    echo "  📊 Success rate: ${SUCCESS_RATE}%"
    echo "  📊 Avg photos/church: ${AVG_PHOTOS}"
  fi
  
  echo ""
  
  # Final verdict
  if [ "$BLOCKED_COUNT" -eq 0 ] && [ "$SUCCESS_COUNT" -eq "$CHURCH_COUNT" ]; then
    echo -e "${GREEN}🎉 PERFECT! All churches scraped successfully!${NC}"
  elif [ "$SUCCESS_RATE" -ge 80 ]; then
    echo -e "${GREEN}✅ GOOD! Most churches scraped successfully.${NC}"
  elif [ "$BLOCKED_COUNT" -gt 0 ]; then
    echo -e "${RED}⚠️  WARNING! Consent blocking detected.${NC}"
    echo -e "${YELLOW}   See GOOGLE_MAPS_CONSENT_FIX.md for troubleshooting.${NC}"
  else
    echo -e "${YELLOW}⚠️  PARTIAL SUCCESS. Review logs for errors.${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}Full logs: $LOG_FILE${NC}"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Done!${NC}"
echo -e "${BLUE}======================================${NC}"
