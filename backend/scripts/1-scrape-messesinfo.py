#!/usr/bin/env python3
"""
🕷️ MessesInfo.fr Parser for GodsPlan
Extracts church data (name, address, mass times) from messesinfo.fr

Usage:
    python3 1-scrape-messesinfo.py --city Paris --limit 20
    python3 1-scrape-messesinfo.py --city Lyon --output data/lyon_churches.json

Output format:
[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "street": "2 Rue Palatine",
    "postal_code": "75006",
    "latitude": 48.8510,
    "longitude": 2.3348,
    "mass_times": [
      {"day": "Dimanche", "time": "09:00"},
      {"day": "Dimanche", "time": "11:00"}
    ],
    "messesinfo_url": "https://www.messesinfo.fr/...",
    "extraction_confidence": 0.85
  }
]

Author: Artemis (GodsPlan ML Pipeline)
Created: 2026-04-05
"""

import sys
import json
import re
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
import time

# Add workspace venv to path for Scrapling
sys.path.insert(0, '/home/ocadmin/.openclaw/workspace/.venv/lib/python3.12/site-packages')

try:
    from scrapling import Fetcher
except ImportError:
    print("❌ Scrapling not found. Install with:")
    print("   /home/ocadmin/.openclaw/workspace/.venv/bin/pip install scrapling")
    sys.exit(1)


class MessesInfoParser:
    """Parser for messesinfo.fr church listings"""
    
    BASE_URL = "http://www.messesinfo.fr"  # Using HTTP (HTTPS has connection issues)
    
    # French days mapping
    DAYS_FR = {
        'lundi': 'Lundi',
        'mardi': 'Mardi',
        'mercredi': 'Mercredi',
        'jeudi': 'Jeudi',
        'vendredi': 'Vendredi',
        'samedi': 'Samedi',
        'dimanche': 'Dimanche',
        'dim': 'Dimanche',
        'sam': 'Samedi',
        'ven': 'Vendredi'
    }
    
    def __init__(self, timeout=20, rate_limit=1.0):
        """
        Args:
            timeout: Request timeout in seconds
            rate_limit: Delay between requests (be polite!)
        """
        self.fetcher = Fetcher()
        self.timeout = timeout
        self.rate_limit = rate_limit
        self.last_request_time = 0
    
    def _rate_limit_wait(self):
        """Enforce rate limiting between requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit:
            time.sleep(self.rate_limit - elapsed)
        self.last_request_time = time.time()
    
    def _fetch_html(self, url: str) -> Optional[str]:
        """Fetch HTML from URL with error handling"""
        self._rate_limit_wait()
        
        try:
            print(f"🔍 Fetching: {url}")
            page = self.fetcher.get(url, timeout=self.timeout)
            
            if page.status >= 400:
                print(f"⚠️  HTTP {page.status}: {url}")
                return None
            
            html = page.body.decode('utf-8') if isinstance(page.body, bytes) else page.body
            print(f"✅ Fetched {len(html)} chars")
            return html
            
        except Exception as e:
            print(f"❌ Error fetching {url}: {type(e).__name__}: {e}")
            return None
    
    def search_churches(self, city: str, limit: int = 20) -> List[Dict]:
        """
        Search churches by city name
        
        MessesInfo.fr typically has URLs like:
        - /paris or /75-paris (department code)
        - Direct listing pages with church entries
        
        Returns:
            List of church dicts with basic info + messesinfo_url
        """
        churches = []
        
        # Try multiple URL patterns
        search_urls = [
            f"{self.BASE_URL}/{city.lower()}",
            f"{self.BASE_URL}/recherche?q={city}",
        ]
        
        # Add department code patterns for major cities
        dept_codes = {
            'paris': '75',
            'lyon': '69',
            'marseille': '13',
            'lille': '59',
            'bordeaux': '33',
            'toulouse': '31'
        }
        
        city_lower = city.lower()
        if city_lower in dept_codes:
            dept = dept_codes[city_lower]
            search_urls.insert(0, f"{self.BASE_URL}/{dept}-{city_lower}")
            search_urls.insert(1, f"{self.BASE_URL}/{dept}")
        
        html = None
        successful_url = None
        
        # Try each URL pattern until one works
        for url in search_urls:
            html = self._fetch_html(url)
            if html and len(html) > 1000:  # Valid response
                successful_url = url
                print(f"✅ Found valid listing at: {url}")
                break
        
        if not html:
            print(f"❌ No valid response for city: {city}")
            return []
        
        # Parse church listings from HTML
        churches = self._parse_church_listings(html, city, successful_url)
        
        # Fetch detailed schedule for each church
        for i, church in enumerate(churches[:limit]):
            if i > 0:
                print(f"\n📍 Processing church {i+1}/{min(limit, len(churches))}")
            
            details = self._fetch_church_details(church['messesinfo_url'])
            if details:
                church.update(details)
        
        return churches[:limit]
    
    def _parse_church_listings(self, html: str, city: str, base_url: str) -> List[Dict]:
        """
        Parse church listings from HTML
        
        Common patterns on messesinfo.fr:
        - Church links: /eglise/<id>-<name>
        - Names in headers: <h3>, <h2>, or .church-name
        - Addresses in spans or divs with .address
        """
        churches = []
        
        # Extract all church URLs (pattern: /eglise/...)
        church_url_pattern = r'href=["\']([^"\']*?/eglise/[^"\']+)["\']'
        church_urls = re.findall(church_url_pattern, html)
        
        # Deduplicate URLs
        unique_urls = list(dict.fromkeys(church_urls))
        
        print(f"📋 Found {len(unique_urls)} unique church URLs")
        
        for url in unique_urls:
            # Build full URL
            if url.startswith('http'):
                full_url = url
            elif url.startswith('/'):
                full_url = f"{self.BASE_URL}{url}"
            else:
                full_url = f"{self.BASE_URL}/{url}"
            
            # Extract church name from URL (slug)
            # Example: /eglise/75006-paris-saint-sulpice → "Saint-Sulpice"
            slug_match = re.search(r'/eglise/[^/]+?-([^/]+)$', url)
            name = slug_match.group(1).replace('-', ' ').title() if slug_match else "Unknown"
            
            # Extract postal code from slug
            postal_match = re.search(r'/eglise/(\d{5})', url)
            postal_code = postal_match.group(1) if postal_match else None
            
            churches.append({
                'name': f"Église {name}",
                'city': city.title(),
                'postal_code': postal_code,
                'messesinfo_url': full_url,
                'extraction_confidence': 0.5  # Will increase with detailed data
            })
        
        return churches
    
    def _fetch_church_details(self, church_url: str) -> Optional[Dict]:
        """
        Fetch detailed schedule and info for a specific church
        
        Returns:
            Dict with street, coordinates, mass_times, etc.
        """
        html = self._fetch_html(church_url)
        
        if not html:
            return None
        
        details = {
            'street': None,
            'latitude': None,
            'longitude': None,
            'mass_times': [],
            'phone': None,
            'email': None
        }
        
        # Extract address
        # Pattern: <div class="address">2 Rue Palatine</div>
        # Or: <span>Adresse :</span> <span>2 Rue Palatine</span>
        address_patterns = [
            r'<[^>]*class=["\'][^"\']*address[^"\']*["\'][^>]*>([^<]+)<',
            r'Adresse\s*:?\s*</?\w+>?\s*<span[^>]*>([^<\n]{5,100})</span>',
            r'<span[^>]*>\s*(\d+\s+[Rr]ue[^<]{5,80})</span>',  # Street numbers
            r'(?:Adresse|Address)\s*:?\s*</?\w*>?\s*([0-9]{1,4}\s+[^<,\n]{3,80})',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
            if match:
                street = match.group(1).strip()
                # Clean up common artifacts
                street = re.sub(r'\s+', ' ', street)
                if len(street) > 5 and any(c.isdigit() for c in street):
                    details['street'] = street
                    break
        
        # Extract coordinates
        # Pattern: latitude: 48.8510, longitude: 2.3348
        # Or: data-lat="48.8510" data-lng="2.3348"
        lat_match = re.search(r'(?:latitude|data-lat)["\s:=]+([0-9.]+)', html)
        lng_match = re.search(r'(?:longitude|data-lng|data-lon)["\s:=]+([0-9.]+)', html)
        
        if lat_match and lng_match:
            details['latitude'] = float(lat_match.group(1))
            details['longitude'] = float(lng_match.group(1))
        
        # Extract phone
        phone_match = re.search(r'(?:tel|téléphone|phone)["\s:>]+([0-9\s.]{10,20})', html, re.IGNORECASE)
        if phone_match:
            details['phone'] = phone_match.group(1).strip()
        
        # Extract email
        email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', html)
        if email_match:
            details['email'] = email_match.group(1)
        
        # Extract mass times
        details['mass_times'] = self._extract_mass_times(html)
        
        # Calculate confidence based on extracted data
        confidence_factors = [
            1.0 if details['mass_times'] else 0.0,
            0.3 if details['street'] else 0.0,
            0.2 if details['latitude'] else 0.0,
            0.2 if details['phone'] or details['email'] else 0.0,
        ]
        details['extraction_confidence'] = round(0.3 + sum(confidence_factors), 2)
        
        return details
    
    def _extract_mass_times(self, html: str) -> List[Dict[str, str]]:
        """
        Extract mass schedule from HTML
        
        Common patterns:
        - "Dimanche : 9h00, 11h00, 18h30"
        - "<strong>Dimanche :</strong> 9h00, 11h00"
        - "<tr><td>Dimanche</td><td>9h00</td></tr>"
        - "Messes dominicales : 9h, 11h"
        """
        mass_times = []
        
        # Pattern 1: Day followed by times with various separators
        # Handles: <strong>Dimanche :</strong> 9h00, 11h00, 18h30
        # Also: Dimanche : 9h00, 11h00
        pattern_day_times = r'<strong>([^<]+)</strong>\s*:?\s*([^<]+)'
        
        matches = re.findall(pattern_day_times, html, re.IGNORECASE)
        
        for day_raw, times_str in matches:
            # Clean up day string (remove trailing :)
            day_raw = day_raw.strip().rstrip(':').strip()
            day_normalized = self._normalize_day(day_raw)
            
            if not day_normalized:
                continue
            
            # Extract individual times from the times string
            time_pattern = r'(\d{1,2})h(\d{0,2})'
            time_matches = re.findall(time_pattern, times_str)
            
            for hour, minute in time_matches:
                time_str = f"{hour.zfill(2)}:{minute.zfill(2) if minute else '00'}"
                mass_times.append({
                    'day': day_normalized,
                    'time': time_str
                })
        
        # Pattern 2: Fallback for non-bold day names
        # Matches: <p>Dimanche : 9h00, 11h00</p>
        if not mass_times:
            pattern_simple = r'<p[^>]*>([^<:]{3,15})\s*:([^<]{3,50})</p>'
            matches2 = re.findall(pattern_simple, html, re.IGNORECASE)
            
            for day_raw, times_str in matches2:
                day_normalized = self._normalize_day(day_raw)
                if not day_normalized:
                    continue
                
                time_pattern = r'(\d{1,2})h(\d{0,2})'
                time_matches = re.findall(time_pattern, times_str)
                
                for hour, minute in time_matches:
                    time_str = f"{hour.zfill(2)}:{minute.zfill(2) if minute else '00'}"
                    mass_times.append({
                        'day': day_normalized,
                        'time': time_str
                    })
        
        # Deduplicate
        seen = set()
        unique_times = []
        for mt in mass_times:
            key = (mt['day'], mt['time'])
            if key not in seen:
                seen.add(key)
                unique_times.append(mt)
        
        return unique_times
    
    def _normalize_day(self, day_str: str) -> Optional[str]:
        """Normalize French day names"""
        day_lower = day_str.lower().strip()
        
        for key, normalized in self.DAYS_FR.items():
            if key in day_lower:
                return normalized
        
        return None


def main():
    parser = argparse.ArgumentParser(
        description="🕷️ MessesInfo.fr Parser - Extract church data for GodsPlan",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python3 1-scrape-messesinfo.py --city Paris --limit 20
    python3 1-scrape-messesinfo.py --city Lyon --output data/lyon.json
    python3 1-scrape-messesinfo.py --city Marseille --limit 50 --rate-limit 2
        """
    )
    
    parser.add_argument(
        '--city',
        required=True,
        help="City name to search (Paris, Lyon, etc.)"
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=20,
        help="Maximum number of churches to fetch (default: 20)"
    )
    parser.add_argument(
        '--output',
        help="Output JSON file path (default: data/messesinfo_<city>_<date>.json)"
    )
    parser.add_argument(
        '--rate-limit',
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)"
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=20,
        help="Request timeout in seconds (default: 20)"
    )
    
    args = parser.parse_args()
    
    # Print header
    print("=" * 70)
    print("🕷️  MessesInfo.fr Parser for GodsPlan")
    print("=" * 70)
    print(f"📍 City: {args.city}")
    print(f"📊 Limit: {args.limit}")
    print(f"⏱️  Rate limit: {args.rate_limit}s between requests")
    print("=" * 70)
    print()
    
    # Initialize parser
    scraper = MessesInfoParser(
        timeout=args.timeout,
        rate_limit=args.rate_limit
    )
    
    # Fetch churches
    start_time = time.time()
    churches = scraper.search_churches(args.city, limit=args.limit)
    elapsed = time.time() - start_time
    
    # Print summary
    print()
    print("=" * 70)
    print("📊 Extraction Summary")
    print("=" * 70)
    print(f"✅ Churches extracted: {len(churches)}")
    
    if churches:
        avg_confidence = sum(c.get('extraction_confidence', 0) for c in churches) / len(churches)
        print(f"📈 Average confidence: {avg_confidence:.2f}")
        
        with_mass_times = sum(1 for c in churches if c.get('mass_times'))
        print(f"⛪ With mass times: {with_mass_times}/{len(churches)} ({with_mass_times/len(churches)*100:.0f}%)")
        
        with_coords = sum(1 for c in churches if c.get('latitude'))
        print(f"📍 With coordinates: {with_coords}/{len(churches)} ({with_coords/len(churches)*100:.0f}%)")
    
    print(f"⏱️  Time elapsed: {elapsed:.1f}s")
    print("=" * 70)
    
    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_dir = Path("data")
        output_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = output_dir / f"messesinfo_{args.city.lower()}_{timestamp}.json"
    
    # Save to JSON
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(churches, f, ensure_ascii=False, indent=2)
    
    print()
    print(f"💾 Saved to: {output_path}")
    print()
    
    # Show sample
    if churches:
        print("📋 Sample church (first result):")
        print(json.dumps(churches[0], ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
