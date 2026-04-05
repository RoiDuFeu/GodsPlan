#!/usr/bin/env python3
"""
Geocode NYC churches using Nominatim (OSM's geocoding service)
More reliable than Overpass API for address-based enrichment
"""
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Dict

DATA_DIR = Path('GodsPlan/data')
NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
USER_AGENT = 'GodsPlan-ChurchDataset/1.0'


def geocode_address(full_address: str, name: str = '') -> Optional[Dict]:
    """Geocode an address using Nominatim"""
    
    # Build query - try address first, fallback to name + address
    query = full_address if full_address else name
    
    params = {
        'q': query,
        'format': 'json',
        'limit': 1,
        'addressdetails': 1,
        'extratags': 1
    }
    
    url = f"{NOMINATIM_URL}?{urllib.parse.urlencode(params)}"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
        
        with urllib.request.urlopen(req, timeout=10) as response:
            results = json.loads(response.read().decode('utf-8'))
            
            if results:
                result = results[0]
                return {
                    'lat': float(result.get('lat', 0)),
                    'lon': float(result.get('lon', 0)),
                    'display_name': result.get('display_name', ''),
                    'osm_type': result.get('osm_type', ''),
                    'osm_id': result.get('osm_id', '')
                }
    
    except Exception as e:
        # Silent fail - geocoding is best effort
        pass
    
    return None


def enrich_dataset(input_file: Path, output_file: Path, sample_size: int = None):
    """Enrich dataset with geocoding"""
    print(f"📍 Geocoding churches from {input_file.name}...")
    
    with open(input_file, 'r') as f:
        churches = json.load(f)
    
    total = len(churches)
    if sample_size:
        churches = churches[:sample_size]
        print(f"   Processing sample: {len(churches)} of {total}")
    else:
        print(f"   Total churches: {total}")
    
    enriched = []
    success = 0
    
    for idx, church in enumerate(churches, 1):
        # Skip if already has coordinates
        if church.get('lat'):
            enriched.append(church)
            success += 1
            continue
        
        # Progress indicator
        if idx % 100 == 0:
            print(f"   Progress: {idx}/{len(churches)} ({success} geocoded)", flush=True)
        
        # Geocode using full address
        full_address = church.get('address', '')
        if not full_address:
            enriched.append(church)
            continue
            
        geo = geocode_address(full_address, church.get('name', ''))
        
        if geo:
            church['lat'] = geo['lat']
            church['lon'] = geo['lon']
            if church['source'] == 'IRS':
                church['source'] = 'IRS+geocoded'
            success += 1
        
        enriched.append(church)
        
        # Be respectful - Nominatim requires 1 req/sec max
        time.sleep(1.1)
    
    # Save
    with open(output_file, 'w') as f:
        json.dump(enriched, f, indent=2)
    
    print(f"\n   ✓ Enriched {success}/{len(churches)} records ({success/len(churches)*100:.1f}%)")
    print(f"   ✓ Saved to: {output_file}")
    
    return enriched


def main():
    print("🌍 Church Geocoding Enrichment")
    print("=" * 50)
    print("⚠️  This will take time (1.1s per record due to API limits)")
    print("   Estimated time for 4881 churches: ~90 minutes")
    print()
    
    # Offer sample mode
    import sys
    if '--sample' in sys.argv:
        try:
            sample_size = int(sys.argv[sys.argv.index('--sample') + 1])
        except:
            sample_size = 100
        print(f"🎯 SAMPLE MODE: Processing {sample_size} churches")
    elif '--full' in sys.argv:
        sample_size = None
        print("🚀 FULL MODE: Processing all churches")
    else:
        print("Usage:")
        print("  --sample 100   Process first 100 churches (testing)")
        print("  --full         Process all churches (~90 min)")
        return
    
    input_file = DATA_DIR / 'churches-nyc.json'
    output_file = DATA_DIR / 'churches-nyc-geocoded.json'
    
    enrich_dataset(input_file, output_file, sample_size)
    
    print("\n✅ Done! Use churches-nyc-geocoded.json for the database")


if __name__ == '__main__':
    main()
