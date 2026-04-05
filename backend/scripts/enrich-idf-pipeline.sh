#!/bin/bash
################################################################################
# 🚀 Île-de-France Church Enrichment Pipeline
#
# Complete autonomous pipeline:
#   1. Scrape messesinfo.fr for IDF churches
#   2. (Optional) Discover church websites
#   3. ML extraction of contact/schedule data
#   4. Import enriched data to Postgres
#
# Usage:
#   ./scripts/enrich-idf-pipeline.sh
#   ./scripts/enrich-idf-pipeline.sh --dry-run
#   ./scripts/enrich-idf-pipeline.sh --department 75  # Paris only
################################################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Config
WORKSPACE_VENV="/home/ocadmin/.openclaw/workspace/.venv/bin/python"
DATA_DIR="data/idf-enrichment"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Île-de-France departments
IDF_DEPARTMENTS=(
  "75:Paris"
  "92:Hauts-de-Seine"
  "93:Seine-Saint-Denis"
  "94:Val-de-Marne"
  "91:Essonne"
  "78:Yvelines"
  "95:Val-d'Oise"
  "77:Seine-et-Marne"
)

# Parse args
DRY_RUN=false
DEPARTMENT_FILTER=""
SKIP_IMPORT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --department)
      DEPARTMENT_FILTER="$2"
      shift 2
      ;;
    --skip-import)
      SKIP_IMPORT=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Île-de-France Enrichment Pipeline${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY RUN MODE - No database writes${NC}"
  echo ""
fi

# Create data directory
mkdir -p "$DATA_DIR"

# Step 1: Scrape messesinfo.fr with Puppeteer
echo -e "${GREEN}Step 1: Scraping messesinfo.fr (Puppeteer)${NC}"
echo ""

MESSESINFO_FILE="$DATA_DIR/messesinfo_${TIMESTAMP}.json"

# Determine which cities to scrape
if [ -n "$DEPARTMENT_FILTER" ]; then
  # Single department
  CITY=$(echo "${IDF_DEPARTMENTS[@]}" | tr ' ' '\n' | grep "^${DEPARTMENT_FILTER}:" | cut -d: -f2)
  if [ -z "$CITY" ]; then
    echo -e "${RED}❌ Unknown department: $DEPARTMENT_FILTER${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}Scraping $CITY (department $DEPARTMENT_FILTER)...${NC}"
  node scripts/1-scrape-messesinfo-puppeteer.js --city "$CITY" --limit 200 --output "$MESSESINFO_FILE"
else
  # All IDF departments (start with Paris)
  echo -e "${BLUE}Scraping Paris (75)...${NC}"
  echo -e "${YELLOW}Note: Scraping all IDF departments can take 30-60 minutes${NC}"
  echo -e "${YELLOW}      For testing, use --department 75 to scrape Paris only${NC}"
  echo ""
  
  node scripts/1-scrape-messesinfo-puppeteer.js --city "Paris" --limit 200 --output "$MESSESINFO_FILE"
fi

# Check if scraping succeeded
if [ ! -f "$MESSESINFO_FILE" ]; then
  echo -e "${RED}❌ Scraping failed - no output file${NC}"
  exit 1
fi

CHURCH_COUNT=$(cat "$MESSESINFO_FILE" | jq length 2>/dev/null || echo "0")

if [ "$CHURCH_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ No churches found in messesinfo.fr${NC}"
  echo -e "${YELLOW}   Possible issues:${NC}"
  echo -e "${YELLOW}   - Site structure changed${NC}"
  echo -e "${YELLOW}   - Network timeout${NC}"
  echo -e "${YELLOW}   - City name incorrect${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Scraped $CHURCH_COUNT churches from messesinfo.fr${NC}"
echo ""

# Step 2: Website Discovery (Google Search)
echo -e "${GREEN}Step 2: Website Discovery (Google Search)${NC}"
echo ""

WITH_URLS_FILE="$DATA_DIR/with_urls_${TIMESTAMP}.json"

echo -e "${BLUE}Finding official websites via Google...${NC}"
echo -e "${YELLOW}⚠️  This will take ~${CHURCH_COUNT} seconds (rate-limited)${NC}"
echo ""

# Run website discovery (limit to 50% for MVP to save time)
WEBSITE_LIMIT=$((CHURCH_COUNT / 2))
if [ $WEBSITE_LIMIT -lt 20 ]; then
  WEBSITE_LIMIT=20
fi

node scripts/2-find-church-websites.js \
  --input "$MESSESINFO_FILE" \
  --output "$WITH_URLS_FILE" \
  --limit $WEBSITE_LIMIT \
  --rate-limit 2000

# Check results
FOUND_WEBSITES=$(cat "$WITH_URLS_FILE" | jq '[.[] | select(.website != null)] | length' 2>/dev/null || echo "0")
SUCCESS_RATE=$((FOUND_WEBSITES * 100 / WEBSITE_LIMIT))

echo ""
echo -e "${GREEN}✅ Website discovery: $FOUND_WEBSITES/$WEBSITE_LIMIT found ($SUCCESS_RATE%)${NC}"
echo ""

# Step 3: ML Extraction
echo -e "${GREEN}Step 3: ML Extraction (batch processing)${NC}"
echo ""

ENRICHED_FILE="$DATA_DIR/enriched_${TIMESTAMP}.json"

echo -e "${BLUE}Running ML extractor on churches with websites...${NC}"
echo -e "${YELLOW}Processing $FOUND_WEBSITES churches (only those with URLs)${NC}"
echo ""

# Filter churches with websites
FILTERED_FILE="$DATA_DIR/with_urls_filtered_${TIMESTAMP}.json"
cat "$WITH_URLS_FILE" | jq '[.[] | select(.website != null)]' > "$FILTERED_FILE"

if ./scripts/run-ml-extractor.sh --batch "$FILTERED_FILE" --output "$ENRICHED_FILE"; then
  echo ""
  echo -e "${GREEN}✅ ML extraction completed${NC}"
  echo -e "${GREEN}   Output: $ENRICHED_FILE${NC}"
  
  # Stats
  ENRICHED_COUNT=$(cat "$ENRICHED_FILE" | jq length 2>/dev/null || echo "0")
  AVG_CONFIDENCE=$(cat "$ENRICHED_FILE" | jq '[.[].extraction_confidence] | add / length' 2>/dev/null || echo "0")
  
  echo ""
  echo -e "${BLUE}📊 Extraction Stats:${NC}"
  echo -e "   Churches processed: $ENRICHED_COUNT"
  echo -e "   Average confidence: $(printf "%.1f" $(echo "$AVG_CONFIDENCE * 100" | bc))%"
  echo ""
else
  echo -e "${RED}❌ ML extraction failed${NC}"
  exit 1
fi

# Step 4: Import to Database
if [ "$SKIP_IMPORT" = false ]; then
  echo -e "${GREEN}Step 4: Import to Database${NC}"
  echo ""
  
  if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}Running import in DRY RUN mode...${NC}"
    npx tsx scripts/4-import-ml-enriched.ts "$ENRICHED_FILE" --dry-run
  else
    echo -e "${BLUE}Importing to database...${NC}"
    npx tsx scripts/4-import-ml-enriched.ts "$ENRICHED_FILE"
  fi
  
  echo ""
  echo -e "${GREEN}✅ Import completed${NC}"
else
  echo -e "${YELLOW}⏭️  Skipping database import (--skip-import)${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Pipeline Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Generated files:${NC}"
echo -e "  Export: $EXPORT_FILE"
echo -e "  Enriched: $ENRICHED_FILE"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Review enriched data: cat $ENRICHED_FILE | jq"
echo -e "  2. Check database: psql -U godsplan -d godsplan -c 'SELECT COUNT(*) FROM churches;'"
echo ""
