#!/usr/bin/env python3
"""
Build NYC churches dataset - Final version using cached partial OSM data
"""
import json
import csv
import re
from pathlib import Path
from typing import Dict, List
from difflib import SequenceMatcher

# NYC city keywords
NYC_CITIES = {'NEW YORK', 'BROOKLYN', 'BRONX', 'QUEENS', 'STATEN ISLAND'}

# Church/worship keywords
WORSHIP_KEYWORDS = [
    'church', 'worship', 'chapel', 'cathedral', 'synagogue', 
    'mosque', 'temple', 'parish', 'congregation', 'ministry',
    'assembly', 'fellowship', 'mission', 'sanctuary', 'shul',
    'masjid', 'buddhist', 'hindu', 'chapel', 'methodist', 
    'baptist', 'catholic', 'episcopal', 'lutheran', 'presbyterian'
]

DATA_DIR = Path('GodsPlan/data')
CACHE_DIR = DATA_DIR / 'cache'


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
    
    print(f"   ✓ Found {len(churches)} IRS churches")
    return churches


def load_osm_cache() -> List[Dict]:
    """Load cached OSM data (partial)"""
    cache_file = CACHE_DIR / 'osm_partial.json'
    
    if cache_file.exists():
        print("📥 Loading cached OSM data...")
        with open(cache_file, 'r') as f:
            places = json.load(f)
            print(f"   ✓ Loaded {len(places)} OSM places")
            return places
    
    print("⚠️  No OSM cache found, will work with IRS data only")
    return []


def normalize_name(name: str) -> str:
    """Normalize name for matching"""
    name = re.sub(r'\b(inc|incorporated|corp|corporation|the|of|saint|st)\b', '', name.lower())
    name = re.sub(r'[^\w\s]', '', name)
    return ' '.join(name.split())


def normalize_address(street: str, city: str = '') -> str:
    """Normalize address for matching"""
    addr = f"{street} {city}".lower()
    replacements = {
        r'\bst\b': 'street', r'\bave\b': 'avenue', r'\brd\b': 'road',
        r'\bblvd\b': 'boulevard', r'\bdr\b': 'drive', r'\bpl\b': 'place',
        r'\bln\b': 'lane', r'\bct\b': 'court', r'\bpkwy\b': 'parkway',
        r'\be\b': 'east', r'\bw\b': 'west', r'\bn\b': 'north', r'\bs\b': 'south'
    }
    for pattern, replacement in replacements.items():
        addr = re.sub(pattern, replacement, addr)
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
            if not osm.get('name') or idx in osm_matched:
                continue
            
            osm_name_norm = normalize_name(osm['name'])
            osm_addr_norm = normalize_address(
                f"{osm.get('housenumber', '')} {osm.get('street', '')}", 
                osm.get('city', '')
            )
            
            name_sim = similarity_score(irs_name_norm, osm_name_norm)
            addr_sim = similarity_score(irs_addr_norm, osm_addr_norm) if irs_addr_norm and osm_addr_norm else 0
            
            # Weighted: 75% name, 25% address
            combined_score = 0.75 * name_sim + 0.25 * addr_sim
            
            if combined_score > best_score:
                best_score = combined_score
                best_match = osm
                best_idx = idx
        
        # Match threshold: 0.65
        if best_score >= 0.65 and best_match:
            record = {
                'name': irs['name'],
                'address': f"{irs['street']}, {irs['city']}, NY {irs['zip']}".strip(', '),
                'city': irs['city'],
                'zip': irs['zip'],
                'lat': best_match.get('lat'),
                'lon': best_match.get('lon'),
                'website': best_match.get('website') or None,
                'phone': best_match.get('phone') or None,
                'denomination': best_match.get('denomination') or None,
                'religion': best_match.get('religion') or None,
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
        if idx not in osm_matched and osm.get('name'):
            record = {
                'name': osm['name'],
                'address': f"{osm.get('housenumber', '')} {osm.get('street', '')}, {osm.get('city', '')} {osm.get('postcode', '')}".strip(', '),
                'city': osm.get('city') or 'New York',
                'zip': osm.get('postcode'),
                'lat': osm.get('lat'),
                'lon': osm.get('lon'),
                'website': osm.get('website') or None,
                'phone': osm.get('phone') or None,
                'denomination': osm.get('denomination') or None,
                'religion': osm.get('religion') or None,
                'source': 'OSM',
                'match_confidence': None
            }
            matched.append(record)
    
    return matched


def main():
    print("🏛️  NYC Churches Dataset Builder - Final")
    print("=" * 50)
    
    # Load IRS data
    irs_csv = CACHE_DIR / 'eo_ny.csv'
    if not irs_csv.exists():
        print("❌ IRS data not found. Run download first.")
        return
    
    irs_churches = filter_irs_churches(irs_csv)
    
    # Load OSM cache (if available)
    osm_places = load_osm_cache()
    
    # Match
    merged_data = match_records(irs_churches, osm_places)
    
    # Save
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
        'with_religion': len([r for r in merged_data if r['religion']]),
        'with_denomination': len([r for r in merged_data if r['denomination']])
    }
    
    print("\n" + "=" * 50)
    print("📊 FINAL STATS")
    print("=" * 50)
    for key, value in stats.items():
        label = key.replace('_', ' ').title()
        print(f"   {label}: {value}")
    
    # Borough breakdown
    print("\n📍 By City:")
    by_city = {}
    for record in merged_data:
        city = record.get('city', 'Unknown')
        by_city[city] = by_city.get(city, 0) + 1
    
    for city in sorted(by_city.keys()):
        print(f"   {city}: {by_city[city]}")
    
    print(f"\n✅ Dataset saved: {output_file}")
    print(f"   Ready for GodsPlan database import!")
    
    return merged_data


if __name__ == '__main__':
    main()
