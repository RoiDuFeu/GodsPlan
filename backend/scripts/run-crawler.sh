#!/bin/bash
################################################################################
# 🕷️ GodsPlan Scrapling Crawler Runner
#
# Wrapper to run the Python crawler with the workspace .venv that has Scrapling
#
# Usage:
#   ./scripts/run-crawler.sh messesinfo --city Paris --limit 5
#   ./scripts/run-crawler.sh diocese --diocese paris
#   ./scripts/run-crawler.sh custom --url "https://example.com/parish"
################################################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

WORKSPACE_VENV="/home/ocadmin/.openclaw/workspace/.venv/bin/python"
CRAWLER_SCRIPT="$(dirname "$0")/scrapling-crawler.py"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🕷️  GodsPlan Scrapling Crawler${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if workspace venv exists
if [ ! -f "$WORKSPACE_VENV" ]; then
  echo -e "${RED}❌ Workspace .venv not found at: $WORKSPACE_VENV${NC}"
  echo ""
  echo "Setup required:"
  echo "  cd /home/ocadmin/.openclaw/workspace"
  echo "  python3 -m venv .venv"
  echo "  .venv/bin/pip install scrapling"
  exit 1
fi

# Check if Scrapling is installed
if ! $WORKSPACE_VENV -c "import scrapling" 2>/dev/null; then
  echo -e "${RED}❌ Scrapling not installed in workspace .venv${NC}"
  echo ""
  echo "Install with:"
  echo "  $WORKSPACE_VENV -m pip install scrapling"
  exit 1
fi

echo -e "${GREEN}✅ Scrapling ready${NC}"
echo ""

# Run the crawler with all arguments passed through
$WORKSPACE_VENV "$CRAWLER_SCRIPT" "$@"

echo ""
echo -e "${GREEN}Done!${NC}"
