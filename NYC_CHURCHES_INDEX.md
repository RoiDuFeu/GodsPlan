# NYC Churches Dataset - File Index

Quick reference for all files related to the NYC churches dataset.

## 📊 Dataset Files

### Primary Dataset
- **`data/churches-nyc.json`** (1.7 MB, 5,080 records)
  - Main production dataset
  - IRS data with partial OSM enrichment (748 with coordinates)
  - ✅ Ready for database import

### Enhanced Dataset (Optional)
- **`data/churches-nyc-geocoded.json`** (6.9 KB sample)
  - Geocoded version with 70% success rate
  - Run `geocode_batch.py` to create full version
  - Adds lat/lon to remaining 85% of records

### Cache & Intermediate
- **`data/cache/eo_ny.csv`**
  - Downloaded IRS source data
  - Cached to avoid re-downloads
- **`data/cache/osm_partial.json`**
  - Partial OSM data from successful queries

## 📚 Documentation

### Executive Summary
- **`COMPLETION_REPORT.md`** ⭐ START HERE
  - Full task completion verification
  - All requirements checklist
  - Quality metrics

### Technical Details
- **`DATASET_SUMMARY.md`**
  - Statistics and data quality
  - Usage examples
  - Next steps

- **`README.md`**
  - Complete user guide
  - Technical details
  - Maintenance instructions

- **`SCHEMA.json`**
  - Field definitions
  - Sample records
  - Data types

## 🛠️ Scripts

### Dataset Builders
1. **`build_churches_final.py`** ⭐ MAIN BUILDER
   - Builds base dataset from IRS + cached OSM
   - Fuzzy matching algorithm
   - Re-runnable

2. **`build_churches_dataset.py`**
   - First attempt (Overpass API issues)
   - Kept for reference

3. **`build_churches_v2.py`**
   - Second iteration (improved chunking)
   - Kept for reference

### Geocoding Tools
1. **`geocode_batch.py`** ⭐ GEOCODING TOOL
   - Batch geocoder with resume capability
   - Saves checkpoints every 100 records
   - Estimated time: ~90 minutes for all 5,080

2. **`geocode_churches.py`**
   - Testing/sample geocoder
   - Use with `--sample N` flag
   - Good for validation

3. **`extract_osm_cache.py`**
   - Helper script for cache management

## 🎯 Quick Navigation

### To Get Started
1. Read: `COMPLETION_REPORT.md`
2. Import: `data/churches-nyc.json`

### To Add Geocoding
1. Test: `python3 geocode_churches.py --sample 20`
2. Full run: `python3 geocode_batch.py`

### To Update Data
1. Delete: `data/cache/eo_ny.csv`
2. Run: `python3 build_churches_final.py`

### To Understand Schema
1. View: `SCHEMA.json`
2. Read: Field definitions section

## 📦 File Sizes

```
data/churches-nyc.json         1.7 MB  ← Main dataset
COMPLETION_REPORT.md           7.7 KB  ← Read this first
DATASET_SUMMARY.md             5.8 KB
README.md                      4.8 KB
SCHEMA.json                    ~3 KB
build_churches_final.py        8.7 KB
geocode_batch.py               4.3 KB
geocode_churches.py            4.4 KB
```

## 🔗 Related Files

These files are part of the broader GodsPlan project but NOT specific to the NYC churches dataset:

- `backend/` - API server
- `web/` - Frontend application  
- `ADMIN_DASHBOARD*.md` - Admin features
- `MAP_CLUSTERING*.md` - Map clustering feature
- `MONITORING*.md` - System monitoring
- `FRONTEND_COMPLETE.md` - Frontend completion
- `TEST_REPORT.md` - Test results

## ⚡ One-Liners

```bash
# View dataset stats
python3 -c "import json; data=json.load(open('data/churches-nyc.json')); print(f'{len(data)} churches')"

# Count by borough
python3 -c "import json; from collections import Counter; data=json.load(open('data/churches-nyc.json')); print(Counter(c['city'] for c in data))"

# Count with coordinates
python3 -c "import json; data=json.load(open('data/churches-nyc.json')); print(f\"{sum(1 for c in data if c.get('lat'))} with coords\")"

# Sample random church
python3 -c "import json, random; data=json.load(open('data/churches-nyc.json')); print(random.choice(data))"
```

---

**Last Updated**: 2026-03-28  
**Total Files**: 13 (dataset) + 3 (docs)  
**Main Dataset**: `data/churches-nyc.json` (5,080 records)  
**Status**: ✅ Production Ready
