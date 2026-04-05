#!/bin/bash
# 🧪 Test Google Custom Search API Setup
# 
# This script validates your Google API credentials and tests the website discovery.
#
# Usage:
#   ./scripts/test-google-api-setup.sh

set -e

BACKEND_DIR="/home/ocadmin/.openclaw/workspace/GodsPlan/backend"
cd "$BACKEND_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🧪 Google Custom Search API - Setup Validation               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Check .env exists
echo "📋 Step 1: Checking .env file..."
if [ ! -f "../.env" ]; then
  echo "❌ .env file not found at $BACKEND_DIR/../.env"
  echo ""
  echo "Create it first:"
  echo "  cp .env.example ../.env"
  echo "  nano ../.env  # Add your Google credentials"
  exit 1
fi
echo "✅ .env file exists"
echo ""

# 2. Check Google credentials
echo "📋 Step 2: Checking Google API credentials..."

API_KEY=$(grep "^GOOGLE_API_KEY=" ../.env | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
CX=$(grep "^GOOGLE_SEARCH_ENGINE_ID=" ../.env | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -z "$API_KEY" ] || [ "$API_KEY" = "" ]; then
  echo "❌ GOOGLE_API_KEY not set in .env"
  echo ""
  echo "Setup instructions:"
  echo "  1. Go to https://console.cloud.google.com/"
  echo "  2. Create project + enable Custom Search API"
  echo "  3. Create API Key"
  echo "  4. Add to .env: GOOGLE_API_KEY=your_key_here"
  echo ""
  echo "See GOOGLE_CUSTOM_SEARCH_SETUP.md for detailed guide"
  exit 1
fi

if [ -z "$CX" ] || [ "$CX" = "" ]; then
  echo "❌ GOOGLE_SEARCH_ENGINE_ID not set in .env"
  echo ""
  echo "Setup instructions:"
  echo "  1. Go to https://programmablesearchengine.google.com/"
  echo "  2. Create new search engine"
  echo "  3. Copy Search Engine ID"
  echo "  4. Add to .env: GOOGLE_SEARCH_ENGINE_ID=your_cx_here"
  echo ""
  echo "See GOOGLE_CUSTOM_SEARCH_SETUP.md for detailed guide"
  exit 1
fi

echo "✅ GOOGLE_API_KEY found (${API_KEY:0:10}...)"
echo "✅ GOOGLE_SEARCH_ENGINE_ID found ($CX)"
echo ""

# 3. Test API connectivity
echo "📋 Step 3: Testing Google API connectivity..."
echo "   (Making a simple test query to validate credentials)"
echo ""

TEST_QUERY="Paris"
API_URL="https://www.googleapis.com/customsearch/v1?key=$API_KEY&cx=$CX&q=$TEST_QUERY&num=1"

# Use curl to test (silent mode, just check HTTP status)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>&1 || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API credentials valid! (HTTP 200)"
elif [ "$HTTP_CODE" = "429" ]; then
  echo "⚠️  API quota exceeded (HTTP 429)"
  echo "   Wait until tomorrow or enable billing"
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ API access forbidden (HTTP 403)"
  echo "   Possible causes:"
  echo "   - Invalid API key"
  echo "   - Custom Search API not enabled"
  echo "   - Quota exceeded"
elif [ "$HTTP_CODE" = "400" ]; then
  echo "❌ Bad request (HTTP 400)"
  echo "   Possible causes:"
  echo "   - Invalid Search Engine ID (cx)"
  echo "   - Malformed query"
else
  echo "❌ API test failed (HTTP $HTTP_CODE)"
  echo "   Check your credentials and try again"
fi
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "⚠️  Skipping church test due to API error"
  echo ""
  echo "Fix the above issues and run again:"
  echo "  ./scripts/test-google-api-setup.sh"
  exit 1
fi

# 4. Test with single church
echo "📋 Step 4: Testing church website discovery..."
echo "   (Searching for: Église Saint-Sulpice, Paris 75006)"
echo ""

# Ensure test file exists
if [ ! -f "data/test-single-church.json" ]; then
  echo '[{"name":"Église Saint-Sulpice","city":"Paris","postal_code":"75006"}]' > data/test-single-church.json
fi

# Run discovery script
node scripts/3-google-api-church-websites.js \
  --input data/test-single-church.json \
  --output data/test-result.json

echo ""

# 5. Validate output
echo "📋 Step 5: Validating output..."

if [ ! -f "data/test-result.json" ]; then
  echo "❌ Output file not created"
  exit 1
fi

WEBSITE=$(cat data/test-result.json | grep -o '"website":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -z "$WEBSITE" ] || [ "$WEBSITE" = "null" ]; then
  echo "⚠️  No website found (this can happen if church has no web presence)"
  echo "   Check data/test-result.json for details"
else
  echo "✅ Website found: $WEBSITE"
fi
echo ""

# 6. Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Validation Complete!                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1️⃣  Test on 50 churches:"
echo "   node scripts/3-google-api-church-websites.js \\"
echo "     --input data/idf-production/paris_only.json \\"
echo "     --output data/paris_50_test.json \\"
echo "     --limit 50"
echo ""
echo "2️⃣  Validate success rate ≥50%"
echo ""
echo "3️⃣  If successful, run on all churches:"
echo "   node scripts/3-google-api-church-websites.js \\"
echo "     --input data/idf-production/paris_only.json \\"
echo "     --output data/paris_with_websites.json"
echo ""
echo "📊 Estimated cost:"
echo "   - 50 churches: $0 (free quota)"
echo "   - 400 churches: ~$1.50"
echo ""
echo "🎯 Target: 50%+ success rate (200+ websites found)"
echo ""
