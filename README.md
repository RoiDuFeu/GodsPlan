# NYC Churches Dataset - GodsPlan

Hybrid dataset combining IRS tax-exempt organization data with OpenStreetMap enrichment.

## 📊 Dataset Summary

- **Total Records**: 5,080+ NYC churches and places of worship
- **Sources**: IRS EO-BMF (Exempt Organizations Business Master File)
- **Coverage**: All 5 NYC boroughs (Manhattan, Brooklyn, Bronx, Queens, Staten Island)
- **Format**: JSON with structured address, coordinates, contact info

## 🗂️ Files

### Data Files
- `data/churches-nyc.json` - Base dataset (IRS data, ~4,881 records)
- `data/churches-nyc-geocoded.json` - Enriched with lat/lon coordinates
- `data/cache/` - Cached intermediate results

### Scripts
- `build_churches_final.py` - Build base dataset from IRS data
- `geocode_batch.py` - Add geocoding (lat/lon) with resume capability
- `geocode_churches.py` - Single-run geocoder (for testing)

## 🚀 Quick Start

### 1. Build Base Dataset (Already Complete)
```bash
python3 build_churches_final.py
```
Output: `data/churches-nyc.json`

### 2. Add Geocoding (Optional, ~90 minutes)
```bash
# Full geocoding with resume capability
python3 geocode_batch.py

# Or test with sample first
python3 geocode_churches.py --sample 100
```

### 3. Use the Data
```python
import json

with open('GodsPlan/data/churches-nyc.json', 'r') as f:
    churches = json.load(f)

# Filter by borough
brooklyn_churches = [c for c in churches if c['city'] == 'Brooklyn']

# Find churches with coordinates
geocoded = [c for c in churches if c['lat']]
```

## 📋 Data Schema

Each record contains:

```json
{
  "name": "CHURCH NAME",
  "address": "123 MAIN ST, Brooklyn, NY 11201",
  "city": "Brooklyn",
  "zip": "11201",
  "lat": 40.6942,           // null if not geocoded
  "lon": -73.9894,          // null if not geocoded
  "website": "...",         // null if unavailable
  "phone": "...",           // null if unavailable
  "denomination": "...",    // null if unavailable
  "religion": "christian",  // null if unavailable
  "source": "IRS|OSM|hybrid|IRS+geocoded",
  "match_confidence": 0.85  // for hybrid matches only
}
```

## 🏙️ Borough Breakdown

| Borough       | Count |
|--------------|-------|
| Brooklyn     | 2,735 |
| Bronx        | 877   |
| Manhattan    | 1,021 |
| Staten Island| 237   |
| Queens       | 211   |

## 🔍 Data Sources

### IRS EO-BMF
- **Source**: https://www.irs.gov/pub/irs-soi/eo_ny.csv
- **Coverage**: Tax-exempt religious organizations in New York State
- **Filtered for**: NYC cities + worship-related keywords
- **Keywords**: church, worship, chapel, cathedral, synagogue, mosque, temple, etc.

### OpenStreetMap (via Nominatim)
- **API**: https://nominatim.openstreetmap.org
- **Used for**: Geocoding addresses → lat/lon coordinates
- **Rate limit**: 1 request/second (respected in batch script)
- **Success rate**: ~70% geocoding match

## ⚙️ Technical Details

### Geocoding Strategy
1. Uses Nominatim (OSM) for address-based geocoding
2. Respects 1 req/sec API limit with 1.1s delay
3. Checkpoint system: saves progress every 100 records
4. Resume capability if interrupted
5. Silent failure on geocoding errors (keeps record without coords)

### Matching Logic
- Fuzzy name matching (75% weight)
- Address normalization (25% weight)
- Match threshold: 0.65 similarity
- Handles abbreviations (St→Street, Ave→Avenue, etc.)

## 🛠️ Maintenance

### Update Dataset
```bash
# Re-download IRS data (updates monthly)
rm data/cache/eo_ny.csv
python3 build_churches_final.py

# Re-geocode new records
python3 geocode_batch.py
```

### Resume Interrupted Geocoding
The batch geocoder automatically resumes from checkpoint:
```bash
# If interrupted, just run again
python3 geocode_batch.py
```

## 📈 Future Enhancements

Potential improvements:
- [ ] Add denomination enrichment via church websites
- [ ] Service times scraping
- [ ] Capacity/size estimates
- [ ] Historical data (founding year)
- [ ] Photos/images from Google Places API
- [ ] Social media links
- [ ] Denomination taxonomy standardization

## 🤝 Contributing

To improve the dataset:
1. Add more worship keywords in `build_churches_final.py`
2. Improve address normalization in matching logic
3. Add fallback geocoding services (Google, Mapbox)
4. Contribute manual corrections for geocoding failures

## 📄 License

Data sources:
- IRS data: Public domain (U.S. government)
- OpenStreetMap: ODbL (Open Database License)

Combined dataset: Use with attribution to sources.

## 🔗 Related

- IRS EO Data: https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
- OSM Nominatim: https://nominatim.org/release-docs/latest/
- GodsPlan Project: [Add link]

---

**Status**: ✅ Base dataset ready (5,080 churches)  
**Geocoding**: 🟡 Optional (run `geocode_batch.py` for coordinates)  
**Last Updated**: 2026-03-28
