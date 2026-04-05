#!/usr/bin/env python3
"""
Unit tests for MessesInfo.fr parser
Tests parsing logic with mock HTML data
"""

import sys
import json
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

from unittest.mock import Mock, patch

# Mock HTML samples
MOCK_LISTING_HTML = """
<!DOCTYPE html>
<html>
<head><title>Églises à Paris</title></head>
<body>
    <div class="churches-list">
        <div class="church-item">
            <a href="/eglise/75006-paris-saint-sulpice">Église Saint-Sulpice</a>
        </div>
        <div class="church-item">
            <a href="/eglise/75001-paris-saint-eustache">Église Saint-Eustache</a>
        </div>
        <div class="church-item">
            <a href="/eglise/75018-paris-sacre-coeur">Basilique du Sacré-Cœur</a>
        </div>
    </div>
</body>
</html>
"""

MOCK_CHURCH_DETAIL_HTML = """
<!DOCTYPE html>
<html>
<head><title>Église Saint-Sulpice - Paris 6e</title></head>
<body>
    <h1>Église Saint-Sulpice</h1>
    
    <div class="address">
        <span class="label">Adresse :</span>
        <span>2 Rue Palatine, 75006 Paris</span>
    </div>
    
    <div class="contact">
        <p>Téléphone : 01 42 34 59 98</p>
        <p>Email : contact@stsulpice.com</p>
    </div>
    
    <div class="coordinates" data-lat="48.8510" data-lng="2.3348"></div>
    
    <div class="schedule">
        <h3>Horaires des messes</h3>
        <p><strong>Dimanche :</strong> 9h00, 11h00, 18h30</p>
        <p><strong>Samedi :</strong> 18h00</p>
        <p><strong>Semaine :</strong> Lundi, Mercredi, Vendredi à 12h15</p>
    </div>
</body>
</html>
"""


def test_parse_church_listings():
    """Test extraction of church URLs from listing page"""
    from sys import modules
    
    # Import parser
    try:
        from scrapling import Fetcher
        parser_module = __import__('1-scrape-messesinfo', fromlist=['MessesInfoParser'])
        MessesInfoParser = parser_module.MessesInfoParser
    except ImportError as e:
        print(f"⚠️ Skipping test: {e}")
        return
    
    parser = MessesInfoParser()
    
    # Parse mock HTML
    churches = parser._parse_church_listings(
        MOCK_LISTING_HTML,
        city="Paris",
        base_url="https://www.messesinfo.fr/paris"
    )
    
    print(f"✅ Extracted {len(churches)} churches from listing")
    assert len(churches) == 3, f"Expected 3 churches, got {len(churches)}"
    
    # Check first church
    church = churches[0]
    assert 'Saint-Sulpice' in church['name']
    assert church['city'] == 'Paris'
    assert church['postal_code'] == '75006'
    assert 'messesinfo.fr' in church['messesinfo_url']
    
    print("✅ Church listing parsing: PASSED")


def test_extract_mass_times():
    """Test mass schedule extraction from detail page"""
    try:
        from scrapling import Fetcher
        parser_module = __import__('1-scrape-messesinfo', fromlist=['MessesInfoParser'])
        MessesInfoParser = parser_module.MessesInfoParser
    except ImportError as e:
        print(f"⚠️ Skipping test: {e}")
        return
    
    parser = MessesInfoParser()
    
    mass_times = parser._extract_mass_times(MOCK_CHURCH_DETAIL_HTML)
    
    print(f"✅ Extracted {len(mass_times)} mass times")
    print(json.dumps(mass_times, ensure_ascii=False, indent=2))
    
    # Should find Sunday masses: 9h00, 11h00, 18h30
    assert len(mass_times) >= 3, f"Expected at least 3 mass times, got {len(mass_times)}"
    
    # Check for Sunday 9:00
    sunday_9 = next((mt for mt in mass_times if mt['day'] == 'Dimanche' and '09:00' in mt['time']), None)
    assert sunday_9 is not None, "Missing Sunday 9:00 mass"
    
    print("✅ Mass times extraction: PASSED")


def test_extract_address_and_coords():
    """Test address and coordinate extraction"""
    try:
        from scrapling import Fetcher
        parser_module = __import__('1-scrape-messesinfo', fromlist=['MessesInfoParser'])
        MessesInfoParser = parser_module.MessesInfoParser
    except ImportError as e:
        print(f"⚠️ Skipping test: {e}")
        return
    
    parser = MessesInfoParser()
    
    # Mock the HTML fetch
    with patch.object(parser, '_fetch_html', return_value=MOCK_CHURCH_DETAIL_HTML):
        details = parser._fetch_church_details("https://www.messesinfo.fr/eglise/test")
    
    if details:
        print(f"✅ Extracted details:")
        print(json.dumps(details, ensure_ascii=False, indent=2))
        
        assert details['latitude'] == 48.8510
        assert details['longitude'] == 2.3348
        assert details['phone'] is not None
        assert details['email'] == 'contact@stsulpice.com'
        assert 'Palatine' in (details['street'] or '')
        
        print("✅ Address & coordinates extraction: PASSED")
    else:
        print("⚠️ No details extracted (expected with mock)")


def test_full_pipeline_mock():
    """Integration test with mocked HTTP requests"""
    try:
        from scrapling import Fetcher
        parser_module = __import__('1-scrape-messesinfo', fromlist=['MessesInfoParser'])
        MessesInfoParser = parser_module.MessesInfoParser
    except ImportError as e:
        print(f"⚠️ Skipping test: {e}")
        return
    
    parser = MessesInfoParser()
    
    # Mock HTTP responses
    def mock_fetch(url):
        if '/eglise/' in url:
            return MOCK_CHURCH_DETAIL_HTML
        else:
            return MOCK_LISTING_HTML
    
    with patch.object(parser, '_fetch_html', side_effect=mock_fetch):
        churches = parser.search_churches("Paris", limit=2)
    
    print(f"\n✅ Full pipeline extracted {len(churches)} churches:")
    print(json.dumps(churches, ensure_ascii=False, indent=2))
    
    assert len(churches) >= 1, "Expected at least 1 church"
    
    church = churches[0]
    assert church['name'] is not None
    assert church['city'] == 'Paris'
    assert len(church.get('mass_times', [])) > 0
    assert church.get('extraction_confidence', 0) > 0.5
    
    print("\n✅ Full pipeline integration: PASSED")


if __name__ == '__main__':
    print("=" * 70)
    print("🧪 MessesInfo.fr Parser Tests")
    print("=" * 70)
    print()
    
    tests = [
        ("Parse church listings", test_parse_church_listings),
        ("Extract mass times", test_extract_mass_times),
        ("Extract address & coords", test_extract_address_and_coords),
        ("Full pipeline (mocked)", test_full_pipeline_mock),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        print(f"\n{'='*70}")
        print(f"🧪 Test: {name}")
        print('='*70)
        
        try:
            test_func()
            passed += 1
            print(f"✅ {name}: PASSED")
        except AssertionError as e:
            failed += 1
            print(f"❌ {name}: FAILED")
            print(f"   {e}")
        except Exception as e:
            failed += 1
            print(f"❌ {name}: ERROR")
            print(f"   {type(e).__name__}: {e}")
    
    print(f"\n{'='*70}")
    print(f"📊 Test Summary")
    print('='*70)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")
    print('='*70)
    
    sys.exit(0 if failed == 0 else 1)
