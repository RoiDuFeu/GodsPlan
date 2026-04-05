# 🕷️ Scrapling Crawler for GodsPlan

## Overview

Lightweight, fast crawler using **Scrapling** (HTTP-based, no browser overhead) to fetch church data from various sources:

- **messesinfo.fr** - French mass schedules
- **Diocesan websites** - Parish directories, events
- **Custom URLs** - Any church/parish website

## Why Scrapling?

| Aspect | Puppeteer (current) | Scrapling (new) |
|--------|---------------------|-----------------|
| **Speed** | Slow (~3-4s/page) | Fast (~0.5-1s) |
| **Resources** | 150-300MB RAM | ~10MB |
| **Use case** | Google Maps (JS-heavy) | Static/semi-dynamic sites |
| **Protections** | Full browser bypass | Smart headers/fingerprinting |

**Strategy:**
- **Puppeteer** for Google Maps (photos, reviews) - already implemented
- **Scrapling** for everything else (schedules, events, diocese sites)

## Setup

Scrapling is already installed in the workspace `.venv`:

```bash
cd /home/ocadmin/.openclaw/workspace
.venv/bin/python -c "from scrapling import Fetcher; print('OK')"
```

The crawler scripts automatically use this venv.

## Usage

### Quick Test

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Test with a custom URL
./scripts/run-crawler.sh custom --url "https://www.messesinfo.fr"
```

### Search messesinfo.fr

```bash
# Search churches in Paris (limit 10)
./scripts/run-crawler.sh messesinfo --city Paris --limit 10

# Search churches in Lyon
./scripts/run-crawler.sh messesinfo --city Lyon --limit 20
```

### Crawl Diocese Websites

```bash
# Crawl Paris diocese
./scripts/run-crawler.sh diocese --diocese paris

# Crawl Lyon diocese
./scripts/run-crawler.sh diocese --diocese lyon
```

### Custom URL

```bash
./scripts/run-crawler.sh custom --url "https://paroisse-example.fr/horaires"
```

## Output

All crawled data is saved to:

```
GodsPlan/backend/data/crawled/
├── messesinfo_Paris_20260405_021830.json
├── diocese_paris_20260405_021845.json
└── custom_20260405_021900.json
```

## Architecture

```
scripts/
├── scrapling-crawler.py    # Python crawler (uses workspace .venv)
└── run-crawler.sh           # Bash wrapper (handles venv path)

data/
└── crawled/                 # Output JSON files
```

## Extending the Crawler

### Add a New Data Source

Edit `scripts/scrapling-crawler.py` and add a new crawler class:

```python
class MySourceCrawler(ChurchCrawler):
    """Crawler for mysource.com"""
    
    def crawl(self, params):
        page = self.fetch_page("https://mysource.com/api")
        
        # Parse HTML/JSON
        data = self.parse_response(page)
        
        return data
```

### Implement HTML Parsing

Use Scrapling's built-in selectors (similar to BeautifulSoup):

```python
from scrapling import Fetcher

fetcher = Fetcher()
page = fetcher.get('https://example.com')

# CSS selectors
churches = page.select('.church-item')

for church in churches:
    name = church.select_one('h2').text
    address = church.select_one('.address').text
    
    print(f"{name} - {address}")
```

## Next Steps

### 1. Implement messesinfo.fr Parser

The current crawler fetches pages but doesn't parse them yet. Need to:

1. Inspect messesinfo.fr HTML structure
2. Identify CSS selectors for:
   - Church name
   - Address
   - Schedule (mass times)
   - Phone/email
3. Implement parsing logic in `MessesInfoCrawler.search_by_city()`

### 2. Diocese Site Mapping

Each diocese has a different website structure. We need to:

1. Map common URL patterns per diocese
2. Create diocese-specific parsers
3. Extract parish directories

### 3. Integration with Database

Once data is crawled, import it into Postgres:

```typescript
// scripts/import-crawled-data.ts
import crawledData from '../data/crawled/messesinfo_Paris_*.json';

for (const church of crawledData) {
  await db.church.upsert({
    where: { name: church.name, city: church.city },
    update: { schedule: church.schedule },
    create: { ...church }
  });
}
```

### 4. Scheduled Updates

Set up cron jobs to refresh data periodically:

```bash
# Crontab entry (run daily at 3am)
0 3 * * * cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend && ./scripts/run-crawler.sh messesinfo --city Paris >> logs/crawler.log 2>&1
```

## Performance Tips

**Rate Limiting:**
- messesinfo.fr: ~1 request/second (be polite)
- Diocese sites: ~0.5 request/second
- Add delays: `time.sleep(1)` between requests

**Caching:**
- Cache fetched pages for 24h (avoid re-downloading)
- Store raw HTML in `data/cache/` before parsing

**Batch Processing:**
- Process cities in batches (10-20 at a time)
- Use async/await for parallel requests (Scrapling supports it)

## Troubleshooting

### ModuleNotFoundError: scrapling

**Problem:** Python can't find Scrapling.

**Solution:** Make sure you're using the workspace venv:

```bash
/home/ocadmin/.openclaw/workspace/.venv/bin/python scripts/scrapling-crawler.py
```

Or use the wrapper script:

```bash
./scripts/run-crawler.sh
```

### Timeout Errors

**Problem:** Pages take too long to load.

**Solution:** Increase timeout in crawler init:

```python
crawler = MessesInfoCrawler(timeout=30)  # default is 20s
```

### Blocked by Anti-Bot

**Problem:** Site detects crawler and blocks requests.

**Solution:** Scrapling handles most cases, but you can:

1. Add custom headers:
```python
page = fetcher.get(url, headers={'User-Agent': 'Mozilla/5.0...'})
```

2. Use proxies (if needed)
3. Fall back to Puppeteer for heavily-protected sites

## Resources

- **Scrapling Docs:** https://github.com/D4Vinci/Scrapling
- **messesinfo.fr:** https://www.messesinfo.fr
- **Diocese directory:** See `DIOCESE_URLS` in `scrapling-crawler.py`

---

**Created:** 2026-04-05  
**Status:** 🟡 Scaffold complete, parsing logic TODO  
**Next:** Implement messesinfo.fr HTML parser
