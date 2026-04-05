#!/usr/bin/env python3
"""
Batch geocode NYC churches with resume capability
Processes in chunks and saves progress
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
CHECKPOINT_FILE = DATA_DIR / 'geocode_checkpoint.json'
BATCH_SIZE = 100  # Save every 100 records


def geocode_address(full_address: str) -> Optional[Dict]:
    """Geocode an address using Nominatim"""
    params = {
        'q': full_address,
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
                    'lon': float(result.get('lon', 0))
                }
    
    except:
        pass
    
    return None


def load_checkpoint():
    """Load checkpoint if exists"""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {'processed': 0, 'churches': []}


def save_checkpoint(data):
    """Save checkpoint"""
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(data, f)


def main():
    print("🌍 Batch Geocoding NYC Churches")
    print("=" * 50)
    
    input_file = DATA_DIR / 'churches-nyc.json'
    output_file = DATA_DIR / 'churches-nyc-geocoded.json'
    
    # Load input
    with open(input_file, 'r') as f:
        all_churches = json.load(f)
    
    total = len(all_churches)
    print(f"📊 Total churches: {total}")
    
    # Load checkpoint
    checkpoint = load_checkpoint()
    start_idx = checkpoint['processed']
    
    if start_idx > 0:
        print(f"📌 Resuming from record {start_idx}")
        enriched = checkpoint['churches']
    else:
        print("🚀 Starting fresh")
        enriched = []
    
    success = sum(1 for c in enriched if c.get('lat'))
    
    # Process remaining
    for idx in range(start_idx, total):
        church = all_churches[idx]
        
        # Progress
        if (idx - start_idx + 1) % 50 == 0:
            elapsed = idx - start_idx + 1
            pct = (idx + 1) / total * 100
            print(f"   [{idx+1}/{total}] {pct:.1f}% - {success} geocoded", flush=True)
        
        # Skip if has coords
        if church.get('lat'):
            enriched.append(church)
            success += 1
            continue
        
        # Geocode
        full_address = church.get('address', '')
        if full_address:
            geo = geocode_address(full_address)
            
            if geo:
                church['lat'] = geo['lat']
                church['lon'] = geo['lon']
                if church['source'] == 'IRS':
                    church['source'] = 'IRS+geocoded'
                success += 1
        
        enriched.append(church)
        
        # Checkpoint every BATCH_SIZE
        if (idx + 1) % BATCH_SIZE == 0:
            save_checkpoint({'processed': idx + 1, 'churches': enriched})
        
        # API limit: 1 req/sec
        time.sleep(1.1)
    
    # Final save
    with open(output_file, 'w') as f:
        json.dump(enriched, f, indent=2)
    
    # Clean checkpoint
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
    
    # Stats
    geocoded = sum(1 for c in enriched if c.get('lat'))
    print(f"\n" + "=" * 50)
    print(f"✅ Complete!")
    print(f"   Total: {len(enriched)}")
    print(f"   Geocoded: {geocoded} ({geocoded/len(enriched)*100:.1f}%)")
    print(f"   Saved: {output_file}")
    
    # Final summary
    with_coords = [c for c in enriched if c.get('lat')]
    by_source = {}
    for c in enriched:
        src = c.get('source', 'unknown')
        by_source[src] = by_source.get(src, 0) + 1
    
    print(f"\n📊 By Source:")
    for source, count in sorted(by_source.items()):
        print(f"   {source}: {count}")


if __name__ == '__main__':
    main()
