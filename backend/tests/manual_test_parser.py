#!/usr/bin/env python3
"""
Manual test of MessesInfo parser with local HTML files
"""

import sys
import json
from pathlib import Path

# Add scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

try:
    parser_module = __import__('1-scrape-messesinfo', fromlist=['MessesInfoParser'])
    MessesInfoParser = parser_module.MessesInfoParser
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_listing_parse():
    """Test parsing of church listing HTML"""
    print("=" * 70)
    print("🧪 Test 1: Parse church listing HTML")
    print("=" * 70)
    
    # Load sample HTML
    html_path = Path(__file__).parent / "sample_messesinfo.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    parser = MessesInfoParser()
    churches = parser._parse_church_listings(html, "Paris", "https://www.messesinfo.fr/75-paris")
    
    print(f"\n✅ Extracted {len(churches)} churches:")
    for church in churches:
        print(f"  - {church['name']} ({church['postal_code']})")
        print(f"    URL: {church['messesinfo_url']}")
    
    print(f"\n📊 Results: {len(churches)} churches found")
    assert len(churches) == 3, f"Expected 3 churches, got {len(churches)}"
    return churches


def test_detail_parse():
    """Test parsing of church detail HTML"""
    print("\n" + "=" * 70)
    print("🧪 Test 2: Parse church detail HTML")
    print("=" * 70)
    
    # Load sample detail HTML
    html_path = Path(__file__).parent / "sample_church_detail.html"
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    parser = MessesInfoParser()
    
    # Extract mass times
    mass_times = parser._extract_mass_times(html)
    print(f"\n✅ Extracted {len(mass_times)} mass times:")
    for mt in mass_times[:10]:  # Show first 10
        print(f"  - {mt['day']} à {mt['time']}")
    
    if len(mass_times) > 10:
        print(f"  ... and {len(mass_times) - 10} more")
    
    # Test detail extraction (mock fetch)
    from unittest.mock import patch
    
    with patch.object(parser, '_fetch_html', return_value=html):
        details = parser._fetch_church_details("https://www.messesinfo.fr/eglise/test")
    
    if details:
        print(f"\n✅ Extracted church details:")
        print(f"  - Address: {details.get('street')}")
        print(f"  - Coordinates: {details.get('latitude')}, {details.get('longitude')}")
        print(f"  - Phone: {details.get('phone')}")
        print(f"  - Email: {details.get('email')}")
        print(f"  - Mass times: {len(details.get('mass_times', []))}")
        print(f"  - Confidence: {details.get('extraction_confidence')}")
        
        assert details['latitude'] == 48.8510
        assert details['longitude'] == 2.3348
        print("\n✅ All assertions passed!")
    else:
        print("❌ No details extracted")
        return None
    
    return details


def test_full_pipeline():
    """Test complete pipeline with local files"""
    print("\n" + "=" * 70)
    print("🧪 Test 3: Full pipeline simulation")
    print("=" * 70)
    
    # Load both HTML files
    listing_path = Path(__file__).parent / "sample_messesinfo.html"
    detail_path = Path(__file__).parent / "sample_church_detail.html"
    
    with open(listing_path, 'r', encoding='utf-8') as f:
        listing_html = f.read()
    
    with open(detail_path, 'r', encoding='utf-8') as f:
        detail_html = f.read()
    
    parser = MessesInfoParser()
    
    # Mock HTTP fetches
    from unittest.mock import patch
    
    def mock_fetch(url):
        if '/eglise/' in url:
            return detail_html
        else:
            return listing_html
    
    with patch.object(parser, '_fetch_html', side_effect=mock_fetch):
        churches = parser.search_churches("Paris", limit=2)
    
    print(f"\n✅ Full pipeline extracted {len(churches)} churches\n")
    
    # Display results in JSON
    print(json.dumps(churches, ensure_ascii=False, indent=2))
    
    # Validate results
    assert len(churches) >= 1, "Expected at least 1 church"
    
    church = churches[0]
    assert church['city'] == 'Paris'
    assert church.get('latitude') is not None
    assert len(church.get('mass_times', [])) > 0
    
    print(f"\n✅ Pipeline validation passed!")
    print(f"📊 Churches with mass times: {sum(1 for c in churches if c.get('mass_times'))}/{len(churches)}")
    
    return churches


if __name__ == '__main__':
    print("=" * 70)
    print("🕷️ MessesInfo.fr Parser - Manual Tests")
    print("=" * 70)
    print()
    
    try:
        # Run tests
        test_listing_parse()
        test_detail_parse()
        churches = test_full_pipeline()
        
        # Save test output
        output_path = Path(__file__).parent.parent / "data" / "test_output.json"
        output_path.parent.mkdir(exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(churches, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 Test output saved to: {output_path}")
        
        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED")
        print("=" * 70)
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
