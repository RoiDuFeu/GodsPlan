#!/usr/bin/env bash
#
# 🕷️ MessesInfo.fr Scraper Wrapper
# Handles venv activation and runs the Python scraper
#
# Usage:
#   ./scripts/run-messesinfo-scraper.sh --city Paris --limit 20
#   ./scripts/run-messesinfo-scraper.sh --city Lyon --output data/lyon.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
WORKSPACE_VENV="/home/ocadmin/.openclaw/workspace/.venv"

# Change to backend directory
cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "$WORKSPACE_VENV" ]; then
    echo "❌ Workspace venv not found: $WORKSPACE_VENV"
    echo "Please install Scrapling first:"
    echo "  cd /home/ocadmin/.openclaw/workspace"
    echo "  python3 -m venv .venv"
    echo "  .venv/bin/pip install scrapling"
    exit 1
fi

# Check if Scrapling is installed
if ! "$WORKSPACE_VENV/bin/python" -c "import scrapling" 2>/dev/null; then
    echo "❌ Scrapling not installed in venv"
    echo "Installing now..."
    "$WORKSPACE_VENV/bin/pip" install scrapling
fi

# Run the scraper
echo "🚀 Running MessesInfo.fr scraper..."
echo ""

"$WORKSPACE_VENV/bin/python" "$SCRIPT_DIR/1-scrape-messesinfo.py" "$@"
