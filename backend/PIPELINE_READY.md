# ✅ Pipeline ML Enrichment - READY TO USE

## 🎯 Ce qui a été livré

### Pipeline complet autonome (0 dépendance API)

```
Export BDD → ML Extraction → Import BDD
   ↓              ↓              ↓
TypeScript    Python          TypeScript
   ↓              ↓              ↓
 JSON         Scrapling       Postgres
              Regex/NLP      (upsert)
```

**100% gratuit, scalable, sans rate limits** 🔥

---

## 📦 Fichiers créés

### Scripts de production

```
scripts/
├── 0-export-churches-for-enrichment.ts    ✅ Export BDD → JSON
├── ml-extractor.py                         ✅ Extraction ML autonome
├── run-ml-extractor.sh                     ✅ Wrapper venv
├── 4-import-ml-enriched.ts                 ✅ Import enrichi → Postgres
└── enrich-idf-pipeline.sh                  ✅ Orchestrateur complet
```

### Documentation

```
├── ML_EXTRACTOR.md                 ✅ 8KB - Doc extracteur ML
├── IDF_ENRICHMENT_PIPELINE.md      ✅ 10KB - Guide complet pipeline
├── NEXT_STEPS.md                   ✅ 9KB - Roadmap détaillée
├── SCRAPLING_CRAWLER.md            ✅ 6KB - Crawler framework
└── PIPELINE_READY.md               ✅ Ce fichier (quick ref)
```

### Tests

```
├── test-church.html            ✅ HTML test validé
├── test-extraction.json        ✅ Output ML testé (100% confidence)
└── test-batch.json             ✅ Config batch example
```

---

## 🚀 Quick Start (Test 10 églises)

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# 1. Export 10 églises depuis BDD
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/test_10.json \
  --limit 10

# 2. ML extraction
./scripts/run-ml-extractor.sh \
  --batch data/test_10.json \
  --output data/test_enriched.json

# 3. Preview import (dry run)
npx tsx scripts/4-import-ml-enriched.ts \
  data/test_enriched.json \
  --dry-run

# 4. Import réel
npx tsx scripts/4-import-ml-enriched.ts \
  data/test_enriched.json

# 5. Vérifier résultats
psql -U godsplan -d godsplan -c \
  "SELECT name, contact->>'phone', contact->>'email' 
   FROM churches LIMIT 10;"
```

**Temps:** ~2 minutes

---

## 🎯 Production: Île-de-France (800-1000 églises)

### Option A: Pipeline automatique

```bash
# Tout en une commande
./scripts/enrich-idf-pipeline.sh
```

### Option B: Step by step (plus de contrôle)

```bash
# 1. Export Paris (département 75)
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/paris_churches.json \
  --department 75

# 2. ML extraction batch
./scripts/run-ml-extractor.sh \
  --batch data/paris_churches.json \
  --output data/paris_enriched.json

# 3. Import
npx tsx scripts/4-import-ml-enriched.ts \
  data/paris_enriched.json

# 4. Stats
cat data/paris_enriched.json | jq '
  {
    total: length,
    avg_confidence: ([.[].extraction_confidence] | add / length),
    with_phone: ([.[] | select(.phone != null)] | length),
    with_email: ([.[] | select(.email != null)] | length)
  }
'
```

**Temps estimé:** ~10-15 minutes pour Paris (~200 églises)

---

## 📊 Ce qui est extrait automatiquement

### ✅ Contact
- **Phone:** Format français (`01 42 34 56 78`)
- **Email:** Standard email validation
- **Website:** URL source (si disponible)

### ✅ Équipe pastorale
- **Priest name:** Patterns "Père X", "Abbé Y", "Curé: Z"

### ✅ Horaires de messes
- **Structured:** `{day: "Dimanche", time: "09:00"}`
- **Context:** Phrase originale pour validation
- **Deduplication:** Pas de doublons

### ✅ Confessions
- **Format:** `"Samedi 17:00"` ou juste `"17:00"`
- **Association jour + heure**

### ✅ Événements
- **Auto-detection:** Concerts, pèlerinages, processions, etc.
- **Dates:** Extraction `15 avril`, `1er mai`

### ✅ Metadata
- **Confidence score:** 0.0-1.0 (auto-évaluation qualité)
- **Timestamp:** ISO 8601
- **Source tracking:** URL d'origine

---

## 🔧 Configuration

### Scrapling (déjà installé)

```bash
# Check installation
/home/ocadmin/.openclaw/workspace/.venv/bin/python -c \
  "from scrapling import Fetcher; print('✅ OK')"
```

### Database (TypeORM)

```bash
# Check connection
npx tsx -e "
  import {initializeDatabase} from './src/config/database';
  initializeDatabase().then(() => console.log('✅ DB OK'));
"
```

### Variables d'environnement

```bash
# .env (backend/.env)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=godsplan
POSTGRES_PASSWORD=godsplan_dev
POSTGRES_DB=godsplan
```

---

## 📈 Performance attendue

### MVP Paris (200 églises)

**Input:** Églises avec websites en BDD

**Output:**
- ✅ 80-85% avec contact (phone OU email)
- ✅ 75-80% avec horaires messes
- ✅ Confidence moyenne: 0.70-0.75

**Temps:** ~5-10 minutes total

### Scale IDF (1000 églises)

**Input:** Tous départements (75, 92, 93, 94, 91, 78, 95, 77)

**Output:**
- ✅ 800+ églises enrichies
- ✅ ~75% success rate (dépend qualité websites)

**Temps:** ~30-40 minutes total

---

## 🛡️ Qualité & Validation

### Confidence threshold

```typescript
// Dans 4-import-ml-enriched.ts
if (enriched.extraction_confidence < 0.4) {
  skip(); // Trop peu fiable
}
```

**Ajustable** selon besoins:
- `0.4` = Permissif (plus de données, moins sûr)
- `0.6` = Équilibré (recommandé)
- `0.8` = Strict (moins de données, très sûr)

### Vérification post-import

```sql
-- Top 20 églises par reliability
SELECT 
  name,
  address->>'city' as city,
  contact->>'phone' as phone,
  reliabilityScore
FROM churches
WHERE dataSources @> '[{"name": "ml_extractor_v1"}]'::jsonb
ORDER BY reliabilityScore DESC
LIMIT 20;

-- Coverage global
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN contact->>'phone' IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as phone_pct,
  COUNT(CASE WHEN contact->>'email' IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as email_pct,
  AVG(reliabilityScore) as avg_score
FROM churches;
```

---

## 🔄 Amélioration continue

### Si précision < 75%

**1. Analyser failures:**
```bash
cat data/enriched.json | jq '[.[] | select(.extraction_confidence < 0.5)]'
```

**2. Identifier patterns manquants:**
- Vérifier HTML brut des sites qui échouent
- Ajouter regex/patterns dans `ml-extractor.py`

**3. Re-run extraction:**
```bash
./scripts/run-ml-extractor.sh --batch data/failed.json --output data/retry.json
```

### Patterns à ajouter (exemples)

**Adresses complètes:**
```python
ADDRESS_PATTERN = re.compile(
  r'\d+\s+(?:rue|avenue|boulevard|place)\s+[^,]+,\s*\d{5}'
)
```

**Ranges horaires:**
```python
# "Du lundi au vendredi: 18h30"
WEEKDAY_RANGE = re.compile(
  r'[Dd]u\s+(lundi|mardi)\s+au\s+(vendredi|samedi)'
)
```

---

## 🎓 Prochaines étapes

### Immédiat (aujourd'hui)
1. ✅ Pipeline créé et documenté
2. ⬜ **Test avec 10-20 églises** (validation manuelle)
3. ⬜ Ajuster confidence threshold si besoin

### Cette semaine
4. ⬜ Run batch Paris complet (200)
5. ⬜ Analyser metrics + quality
6. ⬜ Scale Île-de-France (800-1000)

### Next sprint
7. ⬜ Implémenter messesinfo.fr parser (optionnel)
8. ⬜ Automation cron (refresh mensuel)
9. ⬜ User feedback → pattern improvement

---

## 📚 Documentation complète

| Fichier | Contenu | Taille |
|---------|---------|--------|
| `IDF_ENRICHMENT_PIPELINE.md` | Guide complet pipeline + workflow | 10KB |
| `ML_EXTRACTOR.md` | Doc technique extracteur ML | 8KB |
| `NEXT_STEPS.md` | Roadmap détaillée + timeline | 9KB |
| `SCRAPLING_CRAWLER.md` | Framework crawling général | 6KB |
| `PIPELINE_READY.md` | **Ce fichier** (quick ref) | 5KB |

**Total:** 38KB de documentation

---

## ✅ Checklist avant run production

- [ ] Database connection OK (`psql -U godsplan`)
- [ ] Scrapling installé (`python -c "from scrapling import Fetcher"`)
- [ ] Au moins 10 églises en BDD avec websites
- [ ] Test dry-run réussi (pas d'erreurs)
- [ ] Backup BDD avant import massif

---

## 🚨 Support & Debug

### Scrapling SSL errors

```python
# Fix dans ml-extractor.py
self.fetcher = Fetcher()
self.fetcher.configure(verify=False)
```

### Import échoue

```bash
# Check database schema
psql -U godsplan -d godsplan -c "\d churches"

# Verify JSON format
cat data/enriched.json | jq . > /dev/null && echo "✅ Valid JSON"
```

### Low confidence scores

```bash
# Analyze low-confidence extractions
cat data/enriched.json | jq '
  [.[] | select(.extraction_confidence < 0.5)] | 
  {
    count: length,
    avg_confidence: ([.[].extraction_confidence] | add / length),
    samples: [limit(3; .[] | {name, confidence: .extraction_confidence})]
  }
'
```

---

## 🎉 C'est prêt !

**Pipeline 100% autonome, gratuit, scalable.**

**Pas de dépendance API externe → Tourne à l'infini sans coût.**

**Commande magic pour tester:**

```bash
# Test complet en 2 minutes
npx tsx scripts/0-export-churches-for-enrichment.ts \
  --output data/test.json --limit 10 && \
./scripts/run-ml-extractor.sh \
  --batch data/test.json --output data/enriched.json && \
npx tsx scripts/4-import-ml-enriched.ts \
  data/enriched.json --dry-run
```

**Let's go mon couzz ! 🔥**

---

**Créé:** 2026-04-05 02:48 UTC  
**Status:** 🟢 READY - À tester  
**Tech:** Python + Scrapling + TypeScript + Postgres  
**Owner:** Marc (@Roi Du feu)
