# 🚀 Île-de-France Church Enrichment Pipeline

## Vue d'ensemble

Pipeline **100% autonome** pour enrichir les données d'églises en Île-de-France.

**Aucune dépendance API externe** (Claude/GPT) → Scalable, gratuit, sans rate limits.

---

## Architecture complète

```
┌─────────────────────────┐
│ 0. Export BDD existante │  Églises déjà en base (nom, coords)
│ (TypeScript)            │  → JSON avec liste à enrichir
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 1. messesinfo.fr        │  (TODO) Scrape horaires officiels
│ (Scrapling crawler)     │  → Complète données manquantes
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Website Discovery    │  (Optional) Trouve site web église
│ (Google API ou scrape)  │  → Enrichissement additionnel
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. ML Extraction        │  ✅ Extraction autonome
│ (ml-extractor.py)       │  Contact, horaires, prêtre, événements
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Import BDD           │  ✅ Upsert Postgres
│ (TypeScript)            │  Merge + déduplication + quality score
└─────────────────────────┘
```

---

## Scripts créés

### 0. Export existant

**Fichier:** `scripts/0-export-churches-for-enrichment.ts`

**Usage:**
```bash
# Export toutes les églises Paris
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/paris_churches.json \
  --department 75

# Export Île-de-France sans contact
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/idf_to_enrich.json \
  --department 75 \
  --only-without-contact

# Test avec 50 églises
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/test_batch.json \
  --limit 50
```

**Output format:**
```json
[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "street": "2 Rue Palatine",
    "postal_code": "75006",
    "latitude": 48.8510,
    "longitude": 2.3348,
    "existing_phone": null,
    "existing_email": null,
    "existing_website": "https://stsulpice.com",
    "website": "https://stsulpice.com",
    "db_id": "uuid-here"
  }
]
```

---

### 1. Scrape messesinfo.fr (TODO)

**Fichier:** `scripts/1-scrape-messesinfo.py` (à implémenter)

**Objectif:** Parser messesinfo.fr pour horaires de messes

**Priorité:** Moyenne (optionnel, les sites web des églises ont déjà les horaires)

---

### 2. Website Discovery (TODO)

**Fichier:** `scripts/2-find-websites.py` (à implémenter)

**Options:**
- Google Custom Search API (~$5/1000 requêtes)
- Scraping Google results (gratuit, fragile)
- Annuaire diocésain (manuel initial)

**Priorité:** Basse (pour MVP, utiliser les sites déjà en BDD)

---

### 3. ML Extraction ✅

**Fichier:** `scripts/ml-extractor.py` + `scripts/run-ml-extractor.sh`

**Déjà implémenté et testé !**

**Usage:**
```bash
# Single URL
./scripts/run-ml-extractor.sh \
  --url "https://paroisse-example.fr" \
  --name "Saint-Pierre" \
  --output extraction.json

# Batch processing
./scripts/run-ml-extractor.sh \
  --batch churches_to_enrich.json \
  --output enriched.json
```

**Ce qui est extrait:**
- ✅ Contact (phone, email)
- ✅ Priest name
- ✅ Mass schedule (jour + heure)
- ✅ Confession times
- ✅ Upcoming events
- ✅ Confidence score (0.0-1.0)

---

### 4. Import BDD ✅

**Fichier:** `scripts/4-import-ml-enriched.ts`

**Usage:**
```bash
# Dry run (preview)
npx tsx scripts/4-import-ml-enriched.ts enriched.json --dry-run

# Import réel
npx tsx scripts/4-import-ml-enriched.ts enriched.json
```

**Logique:**
- Upsert par `(name, city)` → évite doublons
- Merge avec données existantes
- Confidence < 0.4 → skip
- Tracking des sources de données
- Calcul reliability score

**DB updates:**
```sql
-- Déjà dans le schema TypeORM
church.contact.phone
church.contact.email
church.massSchedules[]
church.dataSources[] (tracking ML extraction)
church.reliabilityScore
church.lastVerified
```

---

## Pipeline orchestrateur

**Fichier:** `scripts/enrich-idf-pipeline.sh`

**Usage complet:**
```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Dry run (test sans import BDD)
./scripts/enrich-idf-pipeline.sh --dry-run

# Pipeline complet Île-de-France
./scripts/enrich-idf-pipeline.sh

# Paris seulement
./scripts/enrich-idf-pipeline.sh --department 75

# Skip import (juste extraction)
./scripts/enrich-idf-pipeline.sh --skip-import
```

**Steps automatiques:**
1. Export églises existantes
2. (TODO) Scrape messesinfo.fr
3. (TODO) Website discovery
4. ML extraction batch
5. Import en BDD

---

## Workflow recommandé

### MVP: Paris (200 églises)

```bash
# 1. Export églises Paris
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/paris_to_enrich.json \
  --department 75

# 2. Vérifier combien ont déjà un website
cat data/paris_to_enrich.json | jq '[.[] | select(.website != null)] | length'

# 3. ML extraction (batch)
./scripts/run-ml-extractor.sh \
  --batch data/paris_to_enrich.json \
  --output data/paris_enriched.json

# 4. Preview import (dry run)
npx tsx scripts/4-import-ml-enriched.ts \
  data/paris_enriched.json \
  --dry-run

# 5. Import réel
npx tsx scripts/4-import-ml-enriched.ts \
  data/paris_enriched.json

# 6. Vérifier en BDD
psql -U godsplan -d godsplan -c \
  "SELECT name, contact->>'phone' as phone, contact->>'email' as email 
   FROM churches 
   WHERE address->>'postalCode' LIKE '75%' 
   LIMIT 10;"
```

**Temps estimé:** ~5-10 minutes pour 200 églises

---

### Scale: Île-de-France (800-1000 églises)

```bash
# Départements IDF: 75, 92, 93, 94, 91, 78, 95, 77

# Export tous départements
for dept in 75 92 93 94 91 78 95 77; do
  npx tsx scripts/0-export-churches-for-enrichment.ts \
    --output data/dept_${dept}.json \
    --department ${dept}
done

# Merge tous les fichiers
jq -s 'add' data/dept_*.json > data/idf_all.json

# ML extraction (peut prendre 15-30min)
./scripts/run-ml-extractor.sh \
  --batch data/idf_all.json \
  --output data/idf_enriched.json

# Import
npx tsx scripts/4-import-ml-enriched.ts data/idf_enriched.json
```

---

## Performance attendue

### MVP Paris (200 églises)

**Avec websites déjà en BDD:**
- ✅ Extraction: ~200s (1s/église)
- ✅ Import: ~10s
- ✅ Total: ~5 minutes

**Précision attendue:**
- Phone/Email: 80-85%
- Horaires messes: 75-80%
- Confidence moyenne: 0.70-0.75

### Scale IDF (1000 églises)

**Avec websites:**
- Extraction: ~20-30 minutes (parallel possible)
- Import: ~30s
- Total: ~30 minutes

**Sans websites (fallback messesinfo):**
- Besoin d'implémenter parser messesinfo.fr
- +10-15 minutes

---

## Amélioration continue

### Phase 1: MVP (maintenant)
- ✅ Export BDD
- ✅ ML extractor
- ✅ Import BDD
- ⬜ Test Paris (200 églises)

### Phase 2: Optimisation
- ⬜ Parallel batch processing (5x speedup)
- ⬜ HTML caching (re-extraction sans re-fetch)
- ⬜ Patterns améliorés (adresses, weekday ranges)

### Phase 3: Completeness
- ⬜ messesinfo.fr parser
- ⬜ Website discovery automation
- ⬜ Multi-langue (English parishes)

### Phase 4: Automation
- ⬜ Cron job mensuel (refresh data)
- ⬜ Change detection (alertes si horaires changent)
- ⬜ User feedback loop (corrections → improve patterns)

---

## Monitoring & Quality

### Après import, vérifier:

```sql
-- Coverage phone/email
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN contact->>'phone' IS NOT NULL THEN 1 END) as with_phone,
  COUNT(CASE WHEN contact->>'email' IS NOT NULL THEN 1 END) as with_email,
  ROUND(AVG(reliabilityScore), 1) as avg_reliability
FROM churches
WHERE address->>'postalCode' LIKE '75%';

-- Églises avec données ML
SELECT 
  name,
  contact->>'phone' as phone,
  contact->>'email' as email,
  jsonb_array_length(massSchedules) as mass_count,
  reliabilityScore
FROM churches
WHERE dataSources @> '[{"name": "ml_extractor_v1"}]'::jsonb
ORDER BY reliabilityScore DESC
LIMIT 20;
```

### Quality metrics

**Cibles MVP:**
- ✅ 70%+ églises avec contact (phone OU email)
- ✅ 60%+ églises avec horaires messes
- ✅ Reliability score moyen ≥ 65
- ✅ Erreur rate < 5%

---

## Troubleshooting

### Scrapling SSL errors

**Symptôme:** `TLS connect error` sur certains sites

**Fix:**
```python
# Dans ml-extractor.py
self.fetcher = Fetcher()
self.fetcher.configure(verify=False)
```

### Import échoue: "name_city not found"

**Cause:** Index composite manquant

**Fix:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_church_name_city 
ON churches ((address->>'city'), name);
```

### Confidence scores trop bas

**Cause:** Sites mal structurés ou patterns insuffisants

**Action:**
1. Vérifier HTML brut: `cat extraction.json | jq '.context'`
2. Ajouter patterns spécifiques dans ml-extractor.py
3. Re-run extraction

---

## Next Steps

**Immédiat (aujourd'hui):**
1. ✅ Scripts créés et documentés
2. ⬜ **Tester avec sample Paris (10-20 églises)**
3. ⬜ Valider qualité extraction manuellement
4. ⬜ Ajuster patterns si nécessaire

**Cette semaine:**
5. ⬜ Run batch Paris complet (200)
6. ⬜ Analyser results + metrics
7. ⬜ Scale Île-de-France (800-1000)

**Next sprint:**
8. ⬜ Implémenter messesinfo parser
9. ⬜ Automation (cron refresh)
10. ⬜ User feedback integration

---

**Créé:** 2026-04-05  
**Status:** 🟢 Pipeline ready - À tester sur Paris  
**Owner:** Marc (@Roi Du feu)  
**Tech:** Python + Scrapling + TypeScript + Postgres

---

## Quick Start

```bash
# 1. Export test sample
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/test.json \
  --limit 10

# 2. ML extraction
./scripts/run-ml-extractor.sh \
  --batch data/test.json \
  --output data/test_enriched.json

# 3. Preview import
npx tsx scripts/4-import-ml-enriched.ts \
  data/test_enriched.json \
  --dry-run

# 4. Import
npx tsx scripts/4-import-ml-enriched.ts \
  data/test_enriched.json

# 5. Verify
psql -U godsplan -d godsplan -c \
  "SELECT name, contact FROM churches LIMIT 5;"
```

**C'est parti ! 🚀**
