#!/usr/bin/env python3
"""
Build hybrid NYC churches dataset - v2 with better error handling and fallback
"""
import json
import csv
import time
import re
from pathlib import Path
from typing import Dict, List
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
    'assembly', 'fellowship', 'mission', 'sanctuary', 'shul',
    'masjid', 'buddhist', 'hindu'
]

# Smaller geographic chunks to avoid timeouts
NYC_GRID = {
    'Lower_Manhattan': (40.7000, -74.0200, 40.7400, -73.9700),
    'Midtown_Manhattan': (40.7400, -74.0100, 40.7800, -73.9500),
    'Upper_Manhattan': (40.7800, -74.0100, 40.8820, -73.9200),
    'Downtown_Brooklyn': (40.6800, -74.0200, 40.7100, -73.9500),
    'Central_Brooklyn': (40.6400, -74.0100, 40.6800, -73.9200),
    'East_Brooklyn': (40.6400, -73.9500, 40.7000, -73.8700),
    'South_Bronx': (40.7850, -73.9200, 40.8300, -73.8700),
    'North_Bronx': (40.8300, -73.9100, 40.8850, -73.8200),
    'West_Queens': (40.7000, -73.9500, 40.7500, -73.8800),
    'Central_Queens': (40.7000, -73.8800, 40.7500, -73.8000),
    'East_Queens': (40.7000, -73.8000, 40.7700, -73.7300),
    'Staten_Island': (40.5000, -74.2400, 40.6400, -74.0700)
}

DATA_DIR = Path('GodsPlan/data')
CACHE_DIR = DATA_DIR / 'cache'
IRS_CSV_URL = 'https://www.irs.gov/pub/irs-soi/eo_ny.csv'


def download_irs_data():
    """Download IRS EO-BMF NY data"""
    print("📥 Downloading IRS data...")
    cache_file = CACHE_DIR / 'eo_ny.csv'
    
    if cache_file.exists():
        print(f"   ✓ Using cached file")
        return cache_file
    
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(IRS_CSV_URL, cache_file)
    print(f"   ✓ Downloaded")
    return cache_file


def is_worship_org(name: str) -> bool:
    """Check if organization name suggests place of worship"""
    name_lower = name.lower()
    return any(keyword in name_lower for keyword in WORSHIP_KEYWORDS)


def filter_irs_churches(csv_path: Path) -> List[Dict]:
    """Filter IRS data for NYC churches"""
    print("🔍 Filtering IRS data...")
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
                    'zip': row.get('ZIP', '').strip()[:5]
                })
    
    print(f"   ✓ Found {len(churches)} churches")
    return churches


def query_overpass_chunk(bounds: tuple, chunk_name: str) -> List[Dict]:
    """Query single chunk with timeout"""
    south, west, north, east = bounds
    
    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]({south},{west},{north},{east});
      way["amenity"="place_of_worship"]({south},{west},{north},{east});
    );
    out center tags;
    """
    
    url = 'https://overpass-api.de/api/interpreter'
    
    try:
        data = urllib.parse.urlencode({'data': query}).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            elements = result.get('elements', [])
            print(f"      ✓ {len(elements)} places found")
            return elements
    
    except urllib.error.HTTPError as e:
        print(f"      ✗ HTTP {e.code}")
        return []
    except Exception as e:
        print(f"      ✗ Failed: {str(e)[:50]}")
        return []


def fetch_osm_data() -> List[Dict]:
    """Fetch OSM data in small chunks with graceful failures"""
    print("🗺️  Fetching OpenStreetMap data...")
    
    cache_file = CACHE_DIR / 'osm_nyc_worship.json'
    if cache_file.exists():
        print(f"   ✓ Using cached OSM data")
        with open(cache_file, 'r') as f:
            return json.load(f)
    
    all_places = []
    total = len(NYC_GRID)
    succeeded = 0
    
    for idx, (chunk_name, bounds) in enumerate(NYC_GRID.items(), 1):
        print(f"   [{idx}/{total}] {chunk_name}...", flush=True)
        
        elements = query_overpass_chunk(bounds, chunk_name)
        if elements:
            succeeded += 1
        
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
                'area': chunk_name
            }
            
            all_places.append(place)
        
        # Respectful delay
        if idx < total:
            time.sleep(1.5)
    
    print(f"   ✓ Total: {len(all_places)} places from {succeeded}/{total} chunks")
    
    # Cache results
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(cache_file, 'w') as f:
        json.dump(all_places, f, indent=2)
    
    return all_places


def normalize_name(name: str) -> str:
    """Normalize name for matching"""
    name = re.sub(r'\b(inc|incorporated|corp|corporation|the|of)\b', '', name.lower())
    name = re.sub(r'[^\w\s]', '', name)
    return ' '.join(name.split())


def normalize_address(street: str, city: str = '') -> str:
    """Normalize address for matching"""
    addr = f"{street} {city}".lower()
    addr = re.sub(r'\bst\b', 'street', addr)
    addr = re.sub(r'\bave\b', 'avenue', addr)
    addr = re.sub(r'\brd\b', 'road', addr)
    addr = re.sub(r'\bblvd\b', 'boulevard', addr)
    addr = re.sub(r'\bdr\b', 'drive', addr)
    addr = re.sub(r'\bpl\b', 'place', addr)
    addr = re.sub(r'[^\w\s]', '', addr)
    return ' '.join(addr.split())


def similarity_score(s1: str, s2: str) -> float:
    """Calculate string similarity"""
    return SequenceMatcher(None, s1, s2).ratio()


def match_records(irs_churches: List[Dict], osm_places: List[Dict]) -> List[Dict]:
    """Match IRS and OSM records"""
    print("🔗 Matching records...")
    
    matched = []
    osm_matched = set()
    
    for irs in irs_churches:
        irs_name_norm = normalize_name(irs['name'])
        irs_addr_norm = normalize_address(irs['street'], irs['city'])
        
        best_match = None
        best_score = 0
        best_idx = None
        
        for idx, osm in enumerate(osm_places):
            if not osm['name'] or idx in osm_matched:
                continue
            
            osm_name_norm = normalize_name(osm['name'])
            osm_addr_norm = normalize_address(
                f"{osm['housenumber']} {osm['street']}", 
                osm['city']
            )
            
            name_sim = similarity_score(irs_name_norm, osm_name_norm)
            addr_sim = similarity_score(irs_addr_norm, osm_addr_norm) if irs_addr_norm and osm_addr_norm else 0
            
            # Weighted score
            combined_score = 0.75 * name_sim + 0.25 * addr_sim
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = osm
                best_idx = idx
        
        # Match threshold
        if best_score >= 0.65:
            record = {
                'name': irs['name'],
                'address': f"{irs['street']}, {irs['city']}, NY {irs['zip']}".strip(', '),
                'city': irs['city'],
                'zip': irs['zip'],
                'lat': best_match['lat'],
                'lon': best_match['lon'],
                'website': best_match['website'] or None,
                'phone': best_match['phone'] or None,
                'denomination': best_match['denomination'] or None,
                'religion': best_match['religion'] or None,
                'source': 'hybrid',
                'match_confidence': round(best_score, 3)
            }
            matched.append(record)
            osm_matched.add(best_idx)
        else:
            # IRS-only
            record = {
                'name': irs['name'],
                'address': f"{irs['street']}, {irs['city']}, NY {irs['zip']}".strip(', '),
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
            matched.append(record)
    
    # Add unmatched OSM places
    for idx, osm in enumerate(osm_places):
        if idx not in osm_matched and osm['name']:
            record = {
                'name': osm['name'],
                'address': f"{osm['housenumber']} {osm['street']}, {osm['city']} {osm['postcode']}".strip(', '),
                'city': osm['city'] or 'New York',
                'zip': osm['postcode'],
                'lat': osm['lat'],
                'lon': osm['lon'],
                'website': osm['website'] or None,
                'phone': osm['phone'] or None,
                'denomination': osm['denomination'] or None,
                'religion': osm['religion'] or None,
                'source': 'OSM',
                'match_confidence': None
            }
            matched.append(record)
    
    print(f"   ✓ Total records: {len(matched)}")
    print(f"   ✓ Hybrid matched: {len([r for r in matched if r['source'] == 'hybrid'])}")
    print(f"   ✓ IRS-only: {len([r for r in matched if r['source'] == 'IRS'])}")
    print(f"   ✓ OSM-only: {len([r for r in matched if r['source'] == 'OSM'])}")
    
    return matched


def main():
    print("🏛️  NYC Churches Dataset Builder v2")
    print("=" * 50)
    
    # Step 1: IRS data
    irs_csv = download_irs_data()
    irs_churches = filter_irs_churches(irs_csv)
    
    # Step 2: OSM data
    osm_places = fetch_osm_data()
    
    # Step 3: Match
    merged_data = match_records(irs_churches, osm_places)
    
    # Step 4: Save
    output_file = DATA_DIR / 'churches-nyc.json'
    with open(output_file, 'w') as f:
        json.dump(merged_data, f, indent=2)
    
    # Stats
    stats = {
        'total_records': len(merged_data),
        'hybrid_matched': len([r for r in merged_data if r['source'] == 'hybrid']),
        'irs_only': len([r for r in merged_data if r['source'] == 'IRS']),
        'osm_only': len([r for r in merged_data if r['source'] == 'OSM']),
        'with_coordinates': len([r for r in merged_data if r['lat']]),
        'with_websites': len([r for r in merged_data if r['website']]),
        'with_phones': len([r for r in merged_data if r['phone']]),
    }
    
    print("\n" + "=" * 50)
    print("📊 FINAL STATS")
    print("=" * 50)
    for key, value in stats.items():
        label = key.replace('_', ' ').title()
        print(f"   {label}: {value}")
    
    print(f"\n✅ Dataset saved: {output_file}")
    
    return merged_data


if __name__ == '__main__':
    main()
