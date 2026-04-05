# ⚡ QuickStart: MessesInfo Parser

**TL;DR:** Parser créé ✅ mais messesinfo.fr = SPA JS ❌ → Need Puppeteer instead

---

## 🚀 Test rapide (avec mocks)

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Tests unitaires (passent ✅)
/home/ocadmin/.openclaw/workspace/.venv/bin/python tests/manual_test_parser.py

# Output: data/test_output.json (2 églises avec données complètes)
```

---

## ❌ Pourquoi ça marche pas en prod?

```bash
# Test réel
./scripts/run-messesinfo-scraper.sh --city Paris --limit 3

# Résultat: 0 églises found
# Raison: messesinfo.fr charge tout via JavaScript (SPA)
```

---

## ✅ Solution: Plan A (Puppeteer + ML Extractor)

### Workflow

```
1. Puppeteer  → Liste églises (nom, ville)
2. Google     → Sites officiels
3. ML         → Enrichissement (déjà prêt!)
4. Import DB
```

### ETA: 6-8h

### Fichiers à créer

```bash
scripts/1-scrape-messesinfo-puppeteer.js  # 2h
scripts/2-find-websites-google.py         # 1h
scripts/3-enrich-ml.sh                    # ✅ déjà prêt
scripts/4-import-db.ts                    # 2h
```

---

## 📁 Qu'est-ce qui existe déjà?

```
✅ scripts/1-scrape-messesinfo.py        (HTML parser, fonctionne sur mocks)
✅ tests/manual_test_parser.py           (4/4 tests pass)
✅ scripts/README_MESSESINFO.md          (doc complète)
✅ MESSESINFO_PARSER_DELIVERY.md         (specs)
✅ MESSESINFO_STRATEGY_UPDATE.md         (analyse problème)
✅ SUBAGENT_REPORT.md                    (rapport détaillé)

⏳ Puppeteer implementation                (TODO, 2-3h)
⏳ Google Search integration               (TODO, 1h)
⏳ Import DB script                        (TODO, 2h)
```

---

## 🎯 Prochaine action

**Décision requise:**

1. ✅ **Plan A** - Puppeteer + ML Extractor (6-8h, haute qualité)
2. Plan B - Reverse API mobile (4-6h, risqué)
3. Plan C - Parser diocèses only (3-4h Paris, scaling difficile)

**Commencer:**

```bash
npm install puppeteer
# Créer scripts/1-scrape-messesinfo-puppeteer.js
```

---

## 📊 Ce qui marche vs ce qui manque

| Composant | Statut | Notes |
|-----------|--------|-------|
| Parser HTML | ✅ DONE | Fonctionne sur mocks, pas sur SPA |
| Tests | ✅ PASS | 4/4 avec HTML local |
| ML Extractor | ✅ READY | Déjà opérationnel (voir ML_EXTRACTOR.md) |
| Puppeteer scraper | ❌ TODO | 2-3h |
| Google Search | ❌ TODO | 1h |
| DB import | ❌ TODO | 2h |

---

## 💡 Pourquoi Plan A est le meilleur

- ✅ ML Extractor déjà testé et validé
- ✅ Données depuis sites officiels (meilleure qualité)
- ✅ Google API gratuit (100 req/jour)
- ✅ Pas de dépendance sur messesinfo.fr (fragile)

---

**Read full details:** `SUBAGENT_REPORT.md`
