# 🚀 Quick Start - Plan A Pipeline

**Enrichir des églises avec ML Extractor en 3 commandes**

---

## Test rapide (5 églises parisiennes)

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# 1. ML Extraction (1 minute)
./scripts/run-ml-extractor.sh \
  --batch data/test-batch-known-churches.json \
  --output data/test-enriched.json

# 2. Preview import (dry run)
npx tsx scripts/4-import-ml-enriched.ts data/test-enriched.json --dry-run

# 3. Import réel (si OK)
npx tsx scripts/4-import-ml-enriched.ts data/test-enriched.json
```

**Résultat attendu:**
- ✅ 4/5 églises enrichies
- ✅ Phone, priest name, mass times extraits
- ✅ Confidence moyenne: 52%

---

## Production: Enrichir 50-200 églises

### Pré-requis

Créer un fichier JSON avec liste d'églises + URLs:

```json
// data/my_churches.json
[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "postal_code": "75006",
    "website": "https://www.paroisse-saint-sulpice-paris.fr"
  },
  {
    "name": "Église de la Madeleine",
    "city": "Paris",
    "postal_code": "75008",
    "website": "https://www.eglise-lamadeleine.com"
  }
]
```

**Où trouver les URLs?**
- Annuaire diocésain
- Google Search manuel
- Script `2-find-church-websites.js` (voir ci-dessous)

---

### Workflow automatique

```bash
# Si vous avez juste nom + ville (pas d'URLs):

# Étape 1: Trouver les sites web (Google Search)
node scripts/2-find-church-websites.js \
  --input data/churches_no_url.json \
  --output data/churches_with_url.json \
  --limit 50

# Étape 2: ML Extraction
./scripts/run-ml-extractor.sh \
  --batch data/churches_with_url.json \
  --output data/enriched.json

# Étape 3: Import BDD
npx tsx scripts/4-import-ml-enriched.ts data/enriched.json
```

**Temps estimé (50 églises):**
- Website discovery: ~2 min (2s/requête Google)
- ML extraction: ~1 min (1s/église)
- Import: ~5s
- **Total: ~3-4 minutes**

---

## Vérifier les résultats

### En BDD

```bash
# Connexion Postgres
psql -U godsplan -d godsplan

# Églises enrichies récemment
SELECT 
  name,
  address->>'city' as city,
  contact->>'phone' as phone,
  contact->>'email' as email,
  jsonb_array_length(massSchedules) as mass_count,
  reliabilityScore
FROM churches
WHERE lastVerified > NOW() - INTERVAL '1 day'
ORDER BY reliabilityScore DESC
LIMIT 20;
```

### En JSON

```bash
# Voir confidence scores
cat data/enriched.json | jq '[.[] | {name, confidence: .extraction_confidence}]'

# Églises avec téléphone
cat data/enriched.json | jq '[.[] | select(.phone != null) | {name, phone}]'

# Moyenne de confidence
cat data/enriched.json | jq '[.[].extraction_confidence] | add / length'
```

---

## Troubleshooting rapide

### "No churches found" (messesinfo scraper)

**Solution:** Utiliser une liste manuelle ou export BDD existant.

messesinfo.fr scraper nécessite encore ajustements (sélecteurs CSS).

---

### "Failed to fetch" (ML Extractor)

**Causes:**
- URL invalide
- Site hors ligne
- DNS resolution error

**Solution:** Vérifier l'URL dans le navigateur. Corriger le JSON si besoin.

---

### "Skipping (confidence: 30%)"

**Raison:** Données extraites insuffisantes.

**Solutions:**
- Vérifier que le site a bien des horaires de messes
- Diminuer le threshold: éditer `scripts/4-import-ml-enriched.ts`, ligne 118:  
  `if (enriched.extraction_confidence < 0.4)` → `< 0.3`

---

### Website Discovery: "No official website found"

**Normal:** 40-50% des églises n'ont pas de site officiel.

**Solutions:**
- Chercher dans annuaire diocésain
- Utiliser page Facebook/Instagram (si détectée)
- Skip et enrichir manuellement plus tard

---

## Fichiers importants

```
scripts/
├── 1-scrape-messesinfo-puppeteer.js  # messesinfo.fr scraper (à fixer)
├── 2-find-church-websites.js         # Google Search automation
├── ml-extractor.py                    # ML extraction autonome
├── 4-import-ml-enriched.ts            # Import BDD
└── enrich-idf-pipeline.sh             # Pipeline complet

data/
├── test-batch-known-churches.json     # Sample 5 églises (test)
└── test-enriched.json                 # Résultat ML extraction

docs/
├── PLAN_A_DELIVERED.md                # Guide complet (ce doc)
└── ML_EXTRACTOR.md                    # Référence ML patterns
```

---

## Next: Scale à 200 églises

1. **Obtenir liste d'églises Paris:**
   - Export BDD: `npx tsx scripts/0-export-churches-for-enrichment.ts --department 75 --limit 200`
   - Ou annuaire diocésain: https://www.diocese-paris.net

2. **Website Discovery batch:**
   ```bash
   node scripts/2-find-church-websites.js \
     --input data/paris_200.json \
     --output data/paris_with_urls.json \
     --limit 200
   ```

3. **ML Extraction batch:**
   ```bash
   ./scripts/run-ml-extractor.sh \
     --batch data/paris_with_urls.json \
     --output data/paris_enriched.json
   ```

4. **Import:**
   ```bash
   npx tsx scripts/4-import-ml-enriched.ts data/paris_enriched.json
   ```

**ETA:** ~12-15 minutes pour 200 églises.

---

**Questions? Voir `PLAN_A_DELIVERED.md` pour le guide complet.**
