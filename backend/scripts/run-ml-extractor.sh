#!/bin/bash
################################################################################
# 🤖 ML Church Data Extractor Runner
#
# Wrapper to run the ML extractor with workspace .venv
#
# Usage:
#   # Single URL
#   ./scripts/run-ml-extractor.sh --url "https://paroisse.fr" --name "Saint-Pierre"
#
#   # Single HTML file
#   ./scripts/run-ml-extractor.sh --html church.html --output data.json
#
#   # Batch processing
#   ./scripts/run-ml-extractor.sh --batch churches_with_urls.json --output enriched.json
################################################################################

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

WORKSPACE_VENV="/home/ocadmin/.openclaw/workspace/.venv/bin/python"
EXTRACTOR_SCRIPT="$(dirname "$0")/ml-extractor.py"

# Check venv
if [ ! -f "$WORKSPACE_VENV" ]; then
  echo -e "${RED}❌ Workspace .venv not found${NC}"
  exit 1
fi

# Check Scrapling
if ! $WORKSPACE_VENV -c "import scrapling" 2>/dev/null; then
  echo -e "${RED}❌ Scrapling not installed${NC}"
  echo "Install: $WORKSPACE_VENV -m pip install scrapling"
  exit 1
fi

# Run extractor
$WORKSPACE_VENV "$EXTRACTOR_SCRIPT" "$@"
