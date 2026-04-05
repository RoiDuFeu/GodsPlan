# Quebec Churches Scraper

Scraper for Catholic churches across Quebec province (Canada).

## Data Sources

1. **OpenChurch API** (https://open-church.io)
   - Primary source for church locations via Wikidata
   - 392k+ churches worldwide
   - Geographic coordinates (lat/lon)
   - Church names and basic information

2. **Wikidata** (via OpenChurch)
   - Reliable source for church metadata
   - Church photos and addresses

3. **Future enhancements:**
   - Diocesan websites (for detailed mass schedules)
   - horairesdemesse.com (for mass times)
   - OpenStreetMap (for missing addresses)

## Coverage

Currently scrapes **2 major dioceses**:
- ✅ **Archidiocese of Montreal** (~39 churches in OpenChurch/Wikidata)
- ✅ **Archidiocese of Quebec** (~127 churches in OpenChurch/Wikidata)

**Total churches available:** 166 (164 after geographic filtering)

**Other Quebec dioceses** (not yet available in OpenChurch):
- Gatineau, Sherbrooke, Trois-Rivières, Saint-Jean-Longueuil
- Saint-Jérôme, Valleyfield, Joliette, Saint-Hyacinthe
- Rimouski, Chicoutimi, Rouyn-Noranda, Baie-Comeau
- Amos, Gaspé, Hauterive, Nicolet, Mont-Laurier

## Features

✅ **Respects rate limits** (200ms delay between requests)  
✅ **Error handling** (graceful failures, logs errors)  
✅ **Duplicate detection** (by name + city)  
✅ **Geographic filtering** (Quebec bounds: 45-62°N, -79.8 to -57°W)  
✅ **Progress logging** (diocese count, success rate)  
✅ **JSON export** (timestamped files in `backend/data/`)  
✅ **Database import** (PostgreSQL via TypeORM)

## Usage

### Test with 10 churches (dry run)

```bash
cd backend
npx ts-node scripts/import-quebec-churches.ts --dry-run --limit 10
```

### Scrape all available churches (dry run)

```bash
npx ts-node scripts/import-quebec-churches.ts --dry-run
```

### Full import to database

```bash
npx ts-node scripts/import-quebec-churches.ts
```

### Options

- `--dry-run` : Scrape only, don't import to database
- `--limit N` : Limit to N churches (for testing)
- `--no-json` : Don't save JSON file
- `--help` : Show help

## Output

```
🍁 Starting Quebec Churches Import

============================================================
Mode: 💾 LIVE IMPORT
Save JSON: Yes
============================================================

🔍 Step 1: Scraping churches from OpenChurch API...

✅ Archidiocèse de Montréal: 39 churches
✅ Archidiocèse de Québec: 127 churches

📊 Total churches found: 166
📊 Dioceses covered: 2

📋 Found 166 churches to scrape
✅ Scraped: Oratoire Saint-Joseph du Mont-Royal
✅ Scraped: Basilique Notre-Dame de Montréal
...

📊 Scraping Results:
   ✅ Successfully scraped: 164
   ❌ Failed: 0
   📈 Success rate: 100.00%
   🏛️  Dioceses covered: 2
      Archidiocèse de Montréal, Archidiocèse de Québec

💾 Saved to: backend/data/quebec-churches-2026-04-04.json

============================================================
📊 IMPORT SUMMARY
============================================================
Total scraped:     164
✅ Imported:        164
🔄 Duplicates:      0
⏭️  Skipped:         0
❌ Errors:          0
============================================================

✅ Quebec churches import completed!
```

## Data Format

Each church includes:

```json
{
  "name": "Oratoire Saint-Joseph du Mont-Royal",
  "address": {
    "street": "",
    "postalCode": "",
    "city": "Montréal"
  },
  "latitude": 45.491667,
  "longitude": -73.616667,
  "massSchedules": [
    {
      "dayOfWeek": 0,
      "time": "10:00",
      "rite": "french_paul_vi",
      "language": "French",
      "notes": "Horaire à confirmer"
    }
  ],
  "rites": ["french_paul_vi"],
  "languages": ["French"],
  "description": "Église catholique située à Montréal",
  "sourceUrl": "https://www.wikidata.org/wiki/Q284716"
}
```

## Known Limitations

1. **Mass schedules are default placeholders** (Sunday 10:00 AM)
   - Real schedules need to be scraped from diocesan websites
   - Future enhancement: integrate horairesdemesse.com API

2. **Limited diocese coverage** (only 2/19 Quebec dioceses)
   - OpenChurch doesn't have data for all dioceses yet
   - Can be expanded by adding direct Wikidata queries

3. **Missing address details**
   - OpenChurch/Wikidata often lacks street addresses
   - Postal codes are missing
   - Can be enriched via OpenStreetMap or Google Geocoding

## Future Enhancements

### Phase 2: Mass Schedules
- Scrape diocesan websites (Montreal, Quebec, etc.)
- Integrate horairesdemesse.com API
- Parse HTML tables for mass times

### Phase 3: Complete Coverage
- Add direct Wikidata SPARQL queries
- OpenStreetMap fallback for missing churches
- Google Maps API for addresses/phone numbers

### Phase 4: Data Quality
- Geocoding for missing coordinates
- Address normalization
- Phone number validation
- Website scraping for contact info

## Contributing

To add support for more dioceses:

1. Find the OpenChurch diocese ID:
   ```bash
   curl "https://open-church.io/api/dioceses?name=Sherbrooke"
   ```

2. Add to `QUEBEC_DIOCESES` array in `QuebecChurchesScraper.ts`:
   ```typescript
   { id: 1319681, name: 'Archidiocèse de Sherbrooke' }
   ```

3. Test:
   ```bash
   npx ts-node scripts/import-quebec-churches.ts --dry-run --limit 5
   ```

## License

Part of GodsPlan project - MIT License
