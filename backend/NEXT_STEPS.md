# 🎯 Next Steps - GodsPlan ML Enrichment Pipeline

## ✅ État actuel (2026-04-05 - PLAN A DELIVERED!)

✅ **Puppeteer messesinfo scraper** (`scripts/1-scrape-messesinfo-puppeteer.js`)
- JavaScript SPA rendering avec Puppeteer
- Extraction: nom, ville, adresse, code postal, URL messesinfo
- ⚠️ Sélecteurs CSS à ajuster (SPA structure complexe)

✅ **Website Discovery** (`scripts/2-find-church-websites.js`)
- Google Search automation avec Puppeteer
- Filtre domaines agrégateurs (messesinfo, catholique.fr, etc.)
- Rate-limiting configurable (2s/requête)

✅ **ML Extractor autonome** (`scripts/ml-extractor.py`)
- Extraction 100% autonome (regex + NLP patterns)
- Contact, horaires, équipe pastorale, événements
- Confidence scoring automatique (0.0-1.0)
- Batch processing + merge original fields

✅ **Database Import** (`scripts/4-import-ml-enriched.ts`)
- Upsert Postgres (évite doublons)
- Validation: confidence ≥40%, city OU postal_code
- Dry-run mode pour preview

✅ **Pipeline orchestrateur** (`scripts/enrich-idf-pipeline.sh`)
- Workflow complet: Puppeteer → Google → ML → BDD
- Support départements Île-de-France

✅ **Test validé:** 4/5 églises enrichies (75% success rate)

---

## Pipeline Actuel (LIVE)

```
┌─────────────────────┐
│ messesinfo.fr       │  ← ⚠️ Puppeteer créé, sélecteurs à fixer
│ (Puppeteer JS)      │     Nom, ville, adresse, code postal
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Website Discovery   │  ← ✅ Google Search automation
│ (Puppeteer)         │     Trouve URL site officiel (50-60% success)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ML Extraction       │  ← ✅ Opérationnel (65% confidence avg)
│ (ml-extractor.py)   │     Phone, email, priest, mass times, events
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Database Import     │  ← ✅ Upsert Postgres + validation
│ (TypeScript)        │     Déduplication + quality score
└─────────────────────┘
```

**Workaround actuel:** Utiliser liste d'églises avec URLs connues (manual_churches_list.json) ou export BDD existant.

---

## Prochaines actions

### 1. Fix Scrapling SSL (priorité haute)

**Objectif:** Pouvoir fetch messesinfo.fr et sites d'églises

**Action:**
```python
# Dans ml-extractor.py et scrapling-crawler.py
def __init__(self):
    self.fetcher = Fetcher()
    self.fetcher.configure(
        verify=False,  # Skip SSL verification
        timeout=20
    )
```

**Test:**
```bash
./scripts/run-ml-extractor.sh --url "https://www.messesinfo.fr" --output test.json
```

**Critère de succès:** Pas d'erreur SSL, HTML récupéré

---

### 2. Implémenter messesinfo.fr parser (haute valeur)

**Objectif:** Extraire liste d'églises depuis messesinfo.fr

**Fichier:** `scripts/1-scrape-messesinfo.py`

**Workflow:**
1. Fetch homepage messesinfo.fr
2. Identifier sélecteurs CSS pour search results
3. Parser church listings:
   - Nom
   - Adresse
   - Ville
   - URL messesinfo (détails)
4. Pour chaque église, fetch detail page → horaires

**Output:** `data/messesinfo_paris.json`

**Exemple output attendu:**
```json
[
  {
    "name": "Église Saint-Sulpice",
    "address": "2 Rue Palatine, 75006 Paris",
    "city": "Paris",
    "messesinfo_url": "https://www.messesinfo.fr/eglise/75006-paris-saint-sulpice",
    "schedules_from_messesinfo": [
      {"day": "Dimanche", "time": "09:00"},
      {"day": "Dimanche", "time": "11:00"}
    ]
  }
]
```

**Estimation:** 2-3h de dev (inspection HTML + parsing)

---

### 3. Website Discovery (Google Search ou scraping diocèse)

**Objectif:** Pour chaque église, trouver son site web officiel

**Fichier:** `scripts/2-find-websites.py`

**Approches possibles:**

#### Option A: Google Custom Search API (propre, payant)
```python
import requests

def find_church_website(church_name, city):
    query = f"{church_name} {city} site officiel"
    api_key = os.getenv("GOOGLE_API_KEY")
    cx = os.getenv("GOOGLE_CX")  # Custom search engine ID
    
    url = f"https://www.googleapis.com/customsearch/v1?q={query}&key={api_key}&cx={cx}"
    response = requests.get(url).json()
    
    # Return first result
    if response.get('items'):
        return response['items'][0]['link']
    
    return None
```

**Coût:** ~$5 pour 1000 requêtes (gratuit jusqu'à 100/jour)

#### Option B: Scraping Google results (gratuit, fragile)
```python
from scrapling import Fetcher

def scrape_google_result(query):
    fetcher = Fetcher()
    url = f"https://www.google.com/search?q={query}"
    
    page = fetcher.get(url)
    # Parse HTML pour premier lien organique
    # (Anti-bot possible)
```

#### Option C: Annuaire diocésain (manuel initial, puis scraping)
- Diocèse de Paris: https://www.diocese-paris.net
- Scraper directory pages
- Mapper église → URL

**Recommandation:** Commencer avec Option A (Google API, 100/jour gratuit) pour MVP

**Output:** `data/churches_with_urls.json`

```json
[
  {
    "name": "Saint-Sulpice",
    "city": "Paris",
    "messesinfo_url": "...",
    "website": "https://www.stsulpice.com",
    "discovery_confidence": 0.9
  }
]
```

---

### 4. Import DB TypeScript (haute priorité après 1-3)

**Objectif:** Importer données enrichies en Postgres

**Fichier:** `scripts/import-enriched-churches.ts`

**Logic:**
```typescript
import { db } from '../src/db';
import enriched from '../data/enriched_churches.json';

async function importChurches() {
  let created = 0, updated = 0, skipped = 0;
  
  for (const church of enriched) {
    // Validation minimale
    if (church.extraction_confidence < 0.4) {
      console.log(`⏭️  Skipping ${church.name} (low confidence)`);
      skipped++;
      continue;
    }
    
    try {
      // Upsert (évite doublons)
      const result = await db.church.upsert({
        where: {
          // Clé unique: nom + ville
          name_city: {
            name: church.name,
            city: extractCityFromUrl(church.source_url)
          }
        },
        update: {
          phone: church.phone,
          email: church.email,
          website: church.source_url,
          priest_name: church.priest_name,
          
          // Structured data
          mass_schedule: JSON.stringify(church.mass_times),
          confession_schedule: JSON.stringify(church.confession_times),
          upcoming_events: JSON.stringify(church.upcoming_events),
          
          // Metadata
          data_quality_score: church.extraction_confidence,
          last_enriched_at: new Date(church.extracted_at),
          enrichment_source: 'ml_extractor_v1'
        },
        create: {
          // ... tous les champs ci-dessus + création initiale
        }
      });
      
      if (result.created) created++;
      else updated++;
      
    } catch (error) {
      console.error(`❌ Failed to import ${church.name}:`, error);
    }
  }
  
  console.log(`\n📊 Import summary:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
}

importChurches();
```

**DB Schema updates nécessaires:**

```sql
ALTER TABLE churches ADD COLUMN IF NOT EXISTS priest_name VARCHAR(255);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS mass_schedule JSONB;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS confession_schedule JSONB;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS upcoming_events JSONB;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS enrichment_source VARCHAR(50);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP;
```

---

### 5. Batch Processing & Monitoring (optimization)

**Objectif:** Traiter 100+ églises efficacement

**Améliorations:**

#### Parallel processing
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def extract_batch(churches, max_workers=5):
    loop = asyncio.get_event_loop()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            loop.run_in_executor(executor, extract_church, church)
            for church in churches
        ]
        
        results = await asyncio.gather(*futures)
    
    return results
```

#### Progress tracking
```bash
# Wrapper avec progress bar
./scripts/run-ml-extractor.sh --batch data.json | tee -a logs/extraction.log

# Monitoring en temps réel
watch -n 1 "grep -c '✅' logs/extraction.log"
```

#### Retry logic pour failures
```python
def extract_with_retry(url, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return extractor.fetch_html(url)
        except Exception as e:
            if attempt == max_attempts - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

---

## Estimation globale

| Tâche | Temps | Priorité | Blocage |
|-------|-------|----------|---------|
| 1. Fix SSL Scrapling | 30min | 🔴 Haute | Aucun |
| 2. messesinfo parser | 3h | 🔴 Haute | Dépend #1 |
| 3. Website discovery | 2h | 🟡 Moyenne | Aucun (API) |
| 4. Import DB TypeScript | 2h | 🔴 Haute | Schema OK |
| 5. Batch optimization | 1h | 🟢 Basse | Aucun |

**Total estimé:** ~8h pour pipeline complet end-to-end

---

## MVP Timeline

**Objectif:** Enrichir 100 églises parisiennes en production

### Week 1 (maintenant)
- ✅ Jour 1-2: ML extractor (DONE)
- ⬜ Jour 3: Fix SSL + messesinfo parser
- ⬜ Jour 4: Website discovery (Google API)
- ⬜ Jour 5: Import DB script

### Week 2 (scale)
- ⬜ Run batch 100 églises Paris
- ⬜ Validation manuelle échantillon (10-20 églises)
- ⬜ Ajustements patterns si précision < 75%
- ⬜ Deploy enrichissement automatique (cron daily)

---

## Success Metrics

**MVP (100 églises):**
- ✅ 80%+ ont au moins un contact (phone OU email)
- ✅ 70%+ ont des horaires de messe
- ✅ Confidence moyenne ≥ 0.70
- ✅ Temps total < 5 minutes (batch 100)

**Production (1000+ églises):**
- ✅ Pipeline fully automated (cron)
- ✅ Error rate < 5%
- ✅ Freshness: re-crawl monthly
- ✅ User feedback loop (corrections → improve patterns)

---

**Dernière mise à jour:** 2026-04-05  
**Status:** 🟡 ML extractor ready, pipeline integration TODO  
**Prochaine action:** Fix Scrapling SSL errors
