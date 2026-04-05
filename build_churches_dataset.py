#!/usr/bin/env python3
"""
Build hybrid NYC churches dataset combining IRS and OpenStreetMap data
"""
import json
import csv
import time
import re
from pathlib import Path
from typing import Dict, List, Optional
from difflib import SequenceMatcher
import urllib.request
import urllib.parse
import urllib.error

# NYC city keywords for filtering
NYC_CITIES = {'NEW YORK', 'BROOKLYN', 'BRONX', 'QUEENS', 'STATEN ISLAND'}

# Church/worship keywords
WORSHIP_KEYWORDS = [
    'church', 'worship', 'chapel', 'cathedral', 'synagogue', 
    'mosque', 'temple', 'parish', 'congregation', 'ministry',
    'assembly', 'fellowship', 'mission', 'sanctuary'
]

# NYC borough bounding boxes - split larger boroughs into smaller chunks
BOROUGH_BOUNDS = {
    'Manhattan_South': (40.7000, -74.0200, 40.7600, -73.9500),
    'Manhattan_North': (40.7600, -74.0100, 40.8820, -73.9070),
    'Brooklyn_West': (40.5700, -74.0420, 40.6800, -73.9200),
    'Brooklyn_East': (40.6800, -74.0420, 40.7390, -73.8330),
    'Bronx_West': (40.7850, -73.9330, 40.8700, -73.8700),
    'Bronx_East': (40.8700, -73.9330, 40.9176, -73.7650),
    'Queens_West': (40.5430, -73.9620, 40.7200, -73.8300),
    'Queens_East': (40.7200, -73.9300, 40.8000, -73.7004),
    'Staten_Island': (40.4774, -74.2591, 40.6510, -74.0520)
}

DATA_DIR = Path('GodsPlan/data')
CACHE_DIR = DATA_DIR / 'cache'
IRS_CSV_URL = 'https://www.irs.gov/pub/irs-soi/eo_ny.csv'


def download_irs_data():
    """Download IRS EO-BMF NY data"""
    print("📥 Downloading IRS data...")
    cache_file = CACHE_DIR / 'eo_ny.csv'
    
    if cache_file.exists():
        print(f"   ✓ Using cached file: {cache_file}")
        return cache_file
    
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    try:
        urllib.request.urlretrieve(IRS_CSV_URL, cache_file)
        print(f"   ✓ Downloaded to: {cache_file}")
        return cache_file
    except Exception as e:
        print(f"   ✗ Error downloading: {e}")
        raise


def is_worship_org(name: str) -> bool:
    """Check if organization name suggests place of worship"""
    name_lower = name.lower()
    return any(keyword in name_lower for keyword in WORSHIP_KEYWORDS)


def filter_irs_churches(csv_path: Path) -> List[Dict]:
    """Filter IRS data for NYC churches"""
    print("🔍 Filtering IRS data for NYC churches...")
    churches = []
    
    with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            city = row.get('CITY', '').strip().upper()
            name = row.get('NAME', '').strip()
            
            if city in NYC_CITIES and is_worship_org(name):
                churches.append({
                    'name': name,
                    'street': row.get('STREET', '').strip(),
                    'city': city.title(),
                    'state': row.get('STATE', 'NY').strip(),
                    'zip': row.get('ZIP', '').strip()[:5]  # First 5 digits only
                })
    
    print(f"   ✓ Found {len(churches)} churches in IRS data")
    return churches


def query_overpass_api(bounds: tuple, retry_count: int = 3) -> List[Dict]:
    """Query Overpass API for places of worship"""
    south, west, north, east = bounds
    
    # Overpass QL query with shorter timeout
    query = f"""
    [out:json][timeout:30];
    (
      node["amenity"="place_of_worship"]({south},{west},{north},{east});
      way["amenity"="place_of_worship"]({south},{west},{north},{east});
      relation["amenity"="place_of_worship"]({south},{west},{north},{east});
    );
    out center tags;
    """
    
    url = 'https://overpass-api.de/api/interpreter'
    
    for attempt in range(retry_count):
        try:
            data = urllib.parse.urlencode({'data': query}).encode('utf-8')
            req = urllib.request.Request(url, data=data)
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                return result.get('elements', [])
        
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Rate limited
                wait_time = 2 ** attempt * 5  # Exponential backoff
                print(f"   ⏳ Rate limited, waiting {wait_time}s...")
                time.sleep(wait_time)
            elif e.code in [504, 503]:  # Gateway timeout or service unavailable
                wait_time = 2 ** attempt * 3
                print(f"   ⏳ Server timeout, retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"   ✗ HTTP error {e.code}: {e.reason}")
                if attempt == retry_count - 1:
                    raise
                time.sleep(2 ** attempt)
        
        except Exception as e:
            print(f"   ⚠ Attempt {attempt + 1}/{retry_count} failed: {e}")
            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)
            else:
                raise
    
    return []


def fetch_osm_data() -> List[Dict]:
    """Fetch OpenStreetMap places of worship for NYC (batched by borough)"""
    print("🗺️  Fetching OpenStreetMap data...")
    
    cache_file = CACHE_DIR / 'osm_nyc_worship.json'
    if cache_file.exists():
        print(f"   ✓ Using cached OSM data")
        with open(cache_file, 'r') as f:
            return json.load(f)
    
    all_places = []
    total_chunks = len(BOROUGH_BOUNDS)
    
    for idx, (chunk_name, bounds) in enumerate(BOROUGH_BOUNDS.items(), 1):
        print(f"   Querying {chunk_name} ({idx}/{total_chunks})...", flush=True)
        try:
            elements = query_overpass_api(bounds)
            print(f"      ✓ Got {len(elements)} places", flush=True)
        except Exception as e:
            print(f"   ⚠ Failed to fetch {chunk_name}, skipping: {e}", flush=True)
            continue
        
        for elem in elements:
            tags = elem.get('tags', {})
            
            # Get coordinates
            if elem['type'] == 'node':
                lat, lon = elem.get('lat'), elem.get('lon')
            elif 'center' in elem:
                lat, lon = elem['center'].get('lat'), elem['center'].get('lon')
            else:
                continue
            
            place = {
                'osm_id': elem.get('id'),
                'osm_type': elem.get('type'),
                'name': tags.get('name', ''),
                'lat': lat,
                'lon': lon,
                'street': tags.get('addr:street', ''),
                'housenumber': tags.get('addr:housenumber', ''),
                'city': tags.get('addr:city', ''),
                'postcode': tags.get('addr:postcode', ''),
                'religion': tags.get('religion', ''),
                'denomination': tags.get('denomination', ''),
                'website': tags.get('website', '') or tags.get('contact:website', ''),
                'phone': tags.get('phone', '') or tags.get('contact:phone', ''),
                'borough': chunk_name.split('_')[0]
            }
            
            all_places.append(place)
        
        # Be nice to Overpass API
        time.sleep(2)
    
    print(f"   ✓ Found {len(all_places)} places in OSM")
    
    # Cache results
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(all_places, f, indent=2)
    
    return all_places


def normalize_name(name: str) -> str:
    """Normalize name for matching"""
    # Remove common suffixes/prefixes
    name = re.sub(r'\b(inc|incorporated|corp|corporation|the)\b', '', name.lower())
    # Remove punctuation
    name = re.sub(r'[^\w\s]', '', name)
    # Collapse whitespace
    name = ' '.join(name.split())
    return name


def normalize_address(street: str, city: str = '') -> str:
    """Normalize address for matching"""
    addr = f"{street} {city}".lower()
    # Standardize abbreviations
    addr = re.sub(r'\bst\b', 'street', addr)
    addr = re.sub(r'\bave\b', 'avenue', addr)
    addr = re.sub(r'\brd\b', 'road', addr)
    addr = re.sub(r'\bblvd\b', 'boulevard', addr)
    # Remove punctuation
    addr = re.sub(r'[^\w\s]', '', addr)
    addr = ' '.join(addr.split())
    return addr


def similarity_score(s1: str, s2: str) -> float:
    """Calculate string similarity (0-1)"""
    return SequenceMatcher(None, s1, s2).ratio()


def match_records(irs_churches: List[Dict], osm_places: List[Dict]) -> List[Dict]:
    """Match IRS and OSM records using fuzzy matching"""
    print("🔗 Matching IRS and OSM records...")
    
    matched = []
    irs_only = []
    osm_only = set(range(len(osm_places)))
    
    for irs in irs_churches:
        irs_name_norm = normalize_name(irs['name'])
        irs_addr_norm = normalize_address(irs['street'], irs['city'])
        
        best_match = None
        best_score = 0
        best_idx = None
        
        for idx, osm in enumerate(osm_places):
            if not osm['name']:  # Skip unnamed OSM places
                continue
            
            osm_name_norm = normalize_name(osm['name'])
            osm_addr_norm = normalize_address(
                f"{osm['housenumber']} {osm['street']}", 
                osm['city']
            )
            
            # Calculate combined similarity
            name_sim = similarity_score(irs_name_norm, osm_name_norm)
            addr_sim = similarity_score(irs_addr_norm, osm_addr_norm) if irs_addr_norm and osm_addr_norm else 0
            
            # Weight: 70% name, 30% address
            combined_score = 0.7 * name_sim + 0.3 * addr_sim
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = osm
                best_idx = idx
        
        # Match threshold: 0.6
        if best_score >= 0.6:
            record = {
                'name': irs['name'],
                'address': f"{irs['street']}, {irs['city']}, {irs['state']} {irs['zip']}",
                'city': irs['city'],
                'zip': irs['zip'],
                'lat': best_match['lat'],
                'lon': best_match['lon'],
                'website': best_match['website'],
                'phone': best_match['phone'],
                'denomination': best_match['denomination'],
                'religion': best_match['religion'],
                'source': 'hybrid',
                'match_confidence': round(best_score, 3)
            }
            matched.append(record)
            osm_only.discard(best_idx)
        else:
            # IRS-only record
            record = {
                'name': irs['name'],
                'address': f"{irs['street']}, {irs['city']}, {irs['state']} {irs['zip']}",
                'city': irs['city'],
                'zip': irs['zip'],
                'lat': None,
                'lon': None,
                'website': None,
                'phone': None,
                'denomination': None,
                'religion': None,
                'source': 'IRS',
                'match_confidence': None
            }
            irs_only.append(record)
    
    # Add OSM-only records
    for idx in osm_only:
        osm = osm_places[idx]
        if osm['name']:  # Only include named places
            record = {
                'name': osm['name'],
                'address': f"{osm['housenumber']} {osm['street']}, {osm['city']} {osm['postcode']}".strip(', '),
                'city': osm['city'] or osm['borough'],
                'zip': osm['postcode'],
                'lat': osm['lat'],
                'lon': osm['lon'],
                'website': osm['website'],
                'phone': osm['phone'],
                'denomination': osm['denomination'],
                'religion': osm['religion'],
                'source': 'OSM',
                'match_confidence': None
            }
            irs_only.append(record)  # Using irs_only for simplicity, will merge below
    
    print(f"   ✓ Matched: {len(matched)}")
    print(f"   ✓ IRS-only: {len(irs_only)}")
    print(f"   ✓ OSM-only: {len(osm_only)}")
    
    return matched + irs_only


def main():
    print("🏛️  Building NYC Churches Dataset")
    print("=" * 50)
    
    # Step 1: Download and filter IRS data
    irs_csv = download_irs_data()
    irs_churches = filter_irs_churches(irs_csv)
    
    # Step 2: Fetch OSM data
    osm_places = fetch_osm_data()
    
    # Step 3: Match records
    merged_data = match_records(irs_churches, osm_places)
    
    # Step 4: Save final dataset
    output_file = DATA_DIR / 'churches-nyc.json'
    with open(output_file, 'w') as f:
        json.dump(merged_data, f, indent=2)
    
    # Stats
    stats = {
        'total_records': len(merged_data),
        'hybrid_matched': len([r for r in merged_data if r['source'] == 'hybrid']),
        'irs_only': len([r for r in merged_data if r['source'] == 'IRS']),
        'osm_only': len([r for r in merged_data if r['source'] == 'OSM']),
        'with_coordinates': len([r for r in merged_data if r['lat'] is not None]),
        'with_websites': len([r for r in merged_data if r['website']]),
        'with_phones': len([r for r in merged_data if r['phone']]),
    }
    
    print("\n" + "=" * 50)
    print("📊 FINAL STATS")
    print("=" * 50)
    for key, value in stats.items():
        print(f"   {key.replace('_', ' ').title()}: {value}")
    
    print(f"\n✅ Dataset saved to: {output_file}")
    print(f"   Records: {stats['total_records']}")
    print(f"   Hybrid: {stats['hybrid_matched']}")
    print(f"   IRS-only: {stats['irs_only']}")
    print(f"   OSM-only: {stats['osm_only']}")
    
    return merged_data


if __name__ == '__main__':
    main()
