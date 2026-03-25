# Google Scraper & Confidence Scoring

## Overview

The Google enrichment pipeline lives in:
- `src/scrapers/GooglePlacesScraper.ts`
- `src/scrapers/reliabilityScoring.ts`
- `src/scrapers/index.ts`

It enriches existing churches with Google Places data and computes a confidence score from cross-source agreement (Google + messes.info).

---

## Data fetched from Google

For each church query (`name + address + city`):

1. **Find place** (`findplacefromtext`)
2. **Fetch details** (`details`) with fields:
   - `name`
   - `formatted_address`
   - `geometry` (lat/lng)
   - `opening_hours`
   - `photos` (stored as `google-photo:<reference>`)
   - `rating`
   - `user_ratings_total`
   - `reviews`
   - `url`, `website`, `formatted_phone_number`

---

## Confidence scoring algorithm

Implemented in `calculateCrossSourceConfidence(...)`.

### Compared fields (Google vs messes.info)
- name
- street
- postal code
- city
- coordinates
- phone
- website

### Single-source enrichment fields
- messes.info mass schedules
- Google opening hours
- Google rating
- Google reviews
- Google photos

### Field statuses
Each field is classified as:
- `confirmed`
- `divergent`
- `single_source`
- `missing`

### Final score
Weighted average by field status:
- confirmed = **1.00**
- single_source = **0.55**
- missing = **0.25**
- divergent = **0.00**

Then normalized to `0..100`.

This gives:
- higher scores when multiple key fields agree,
- lower scores when divergences exist,
- medium support when data exists in only one source.

---

## Storage in DB

The pipeline updates:
- `churches.reliabilityScore`
- `churches.dataSources` (JSONB)

`dataSources` contains entries for:
- `messes.info`
- `google-places`

Google entry includes metadata:
- `placeId`
- `openingHours`
- `rating`
- `userRatingsTotal`
- `reviews` (top 3)
- `photoReferences`
- `confidence` breakdown (confirmed/divergent/single_source/missing)
- `mode` (`live-api` or `fixtures`)

---

## Commands

```bash
# Live Google Places API (requires GOOGLE_PLACES_API_KEY)
npm run scrape:google

# Fixture mode (no API key, deterministic tests)
npm run scrape:google -- --fixtures --church "Notre-Dame,Sacré-Cœur"

# Full run including messes.info refresh first
npm run scrape -- --with-messes
```

A markdown summary is generated at:
- `GOOGLE_ENRICHMENT_REPORT.md`
