#!/usr/bin/env bash
#
# 🔍 Test d'accès à messesinfo.fr
# Diagnostic des problèmes de connexion

set -uo pipefail

echo "======================================================================="
echo "🔍 Diagnostic: Accès à messesinfo.fr"
echo "======================================================================="
echo ""

URL="https://www.messesinfo.fr"
ALT_URLS=(
    "https://www.messesinfo.fr/paris"
    "https://www.messesinfo.fr/75-paris"
    "http://www.messesinfo.fr"  # HTTP fallback
)

# Test 1: DNS resolution
echo "1️⃣  Test DNS resolution..."
if host www.messesinfo.fr >/dev/null 2>&1; then
    IP=$(host www.messesinfo.fr | grep "has address" | head -1 | awk '{print $4}')
    echo "   ✅ DNS OK: www.messesinfo.fr → $IP"
else
    echo "   ❌ DNS FAILED: Cannot resolve www.messesinfo.fr"
    exit 1
fi
echo ""

# Test 2: Ping
echo "2️⃣  Test ping..."
if ping -c 2 -W 3 www.messesinfo.fr >/dev/null 2>&1; then
    echo "   ✅ PING OK: Server reachable"
else
    echo "   ⚠️  PING FAILED: Server not responding (may be blocked)"
fi
echo ""

# Test 3: Port 443 (HTTPS)
echo "3️⃣  Test port 443 (HTTPS)..."
if timeout 5 bash -c "</dev/tcp/www.messesinfo.fr/443" 2>/dev/null; then
    echo "   ✅ PORT 443 OPEN"
else
    echo "   ❌ PORT 443 CLOSED or TIMEOUT"
fi
echo ""

# Test 4: Port 80 (HTTP)
echo "4️⃣  Test port 80 (HTTP)..."
if timeout 5 bash -c "</dev/tcp/www.messesinfo.fr/80" 2>/dev/null; then
    echo "   ✅ PORT 80 OPEN"
else
    echo "   ❌ PORT 80 CLOSED or TIMEOUT"
fi
echo ""

# Test 5: cURL avec timeout
echo "5️⃣  Test HTTP request (cURL)..."
echo ""

for test_url in "$URL" "${ALT_URLS[@]}"; do
    echo "   Testing: $test_url"
    
    HTTP_CODE=$(curl -L -s -o /dev/null -w "%{http_code}" \
        --connect-timeout 5 \
        --max-time 10 \
        --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
        "$test_url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ HTTP $HTTP_CODE: SUCCESS"
        
        # Fetch sample content
        echo ""
        echo "   📄 Sample content (first 500 chars):"
        curl -L -s --connect-timeout 5 --max-time 10 \
            --user-agent "Mozilla/5.0" \
            "$test_url" 2>/dev/null | head -c 500
        echo ""
        echo "   ..."
        
        echo ""
        echo "======================================================================="
        echo "✅ SUCCESS: messesinfo.fr is accessible!"
        echo "======================================================================="
        echo ""
        echo "You can now run the parser:"
        echo "  cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend"
        echo "  ./scripts/run-messesinfo-scraper.sh --city Paris --limit 5"
        echo ""
        exit 0
        
    elif [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo "   ⚠️  HTTP $HTTP_CODE: Redirect (following...)"
    elif [ "$HTTP_CODE" = "000" ]; then
        echo "   ❌ CONNECTION FAILED: Timeout or network error"
    else
        echo "   ❌ HTTP $HTTP_CODE: Error response"
    fi
    
    echo ""
done

# Test 6: Scrapling direct test
echo "6️⃣  Test Scrapling (Python)..."
echo ""

/home/ocadmin/.openclaw/workspace/.venv/bin/python - <<'PYEOF'
import sys
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

try:
    from scrapling import Fetcher
    
    fetcher = Fetcher()
    page = fetcher.get('https://www.messesinfo.fr', timeout=10)
    
    print(f"   ✅ Scrapling OK: HTTP {page.status}")
    print(f"   📄 Content length: {len(page.body)} bytes")
    
    if page.status == 200:
        print("\n   ✅✅ SUCCESS: messesinfo.fr accessible via Scrapling!")
    
except Exception as e:
    print(f"   ❌ Scrapling FAILED: {type(e).__name__}: {e}")
    sys.exit(1)
PYEOF

SCRAPLING_EXIT=$?

echo ""
echo "======================================================================="

if [ $SCRAPLING_EXIT -eq 0 ]; then
    echo "✅ messesinfo.fr is ACCESSIBLE"
    echo "======================================================================="
    echo ""
    echo "Next steps:"
    echo "  1. Run the parser:"
    echo "     ./scripts/run-messesinfo-scraper.sh --city Paris --limit 10"
    echo ""
    echo "  2. Check output:"
    echo "     cat data/messesinfo_paris_*.json | jq ."
    echo ""
else
    echo "❌ messesinfo.fr is NOT ACCESSIBLE"
    echo "======================================================================="
    echo ""
    echo "Possible causes:"
    echo "  1. Site is temporarily down"
    echo "  2. Firewall/network blocking the connection"
    echo "  3. Geoblocking (try VPN/proxy)"
    echo "  4. Anti-bot protection (try different User-Agent)"
    echo ""
    echo "Workarounds:"
    echo "  1. Wait and retry later"
    echo "  2. Use a proxy/VPN"
    echo "  3. Contact site admin if prolonged downtime"
    echo ""
    echo "Parser is ready and tested (with mocks):"
    echo "  /home/ocadmin/.openclaw/workspace/.venv/bin/python tests/manual_test_parser.py"
    echo ""
fi

echo "Diagnostic complete."
echo ""
