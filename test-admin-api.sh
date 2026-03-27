#!/bin/bash

# Script de test des endpoints admin
# Usage: ./test-admin-api.sh [API_BASE_URL]

API_BASE="${1:-http://localhost:3000/api/v1}"

echo "🔍 Testing God's Plan Admin API Endpoints"
echo "📍 Base URL: $API_BASE"
echo ""

# Test 1: Health check
echo "1️⃣ Testing /health"
curl -s "${API_BASE%/api/v1}/health" | jq '.' || echo "❌ Failed"
echo ""

# Test 2: Admin stats
echo "2️⃣ Testing /api/v1/admin/stats"
curl -s "$API_BASE/admin/stats" | jq '.' || echo "❌ Failed"
echo ""

# Test 3: Churches map
echo "3️⃣ Testing /api/v1/admin/churches-map"
curl -s "$API_BASE/admin/churches-map" | jq '.meta' || echo "❌ Failed"
echo ""

# Test 4: Trigger scrape
echo "4️⃣ Testing POST /api/v1/admin/scrape"
curl -s -X POST "$API_BASE/admin/scrape" | jq '.' || echo "❌ Failed"
echo ""

echo "✅ All tests completed!"
