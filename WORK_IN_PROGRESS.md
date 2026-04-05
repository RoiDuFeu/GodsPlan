# GodsPlan - Work in Progress

## Dernier commit (2026-04-05)
Commit `e443801` - Mission 2: Website discovery pipeline

## Contexte actuel

On est sur la **Mission 2** : découverte automatique des sites web d'églises pour alimenter le scraper.

### Ce qui marche maintenant

1. **Scraping messesinfo.org** (`1-scrape-messesinfo-fixed.js`)
   - Parse les 5000+ églises de France
   - Extrait: nom, adresse, horaires de messes
   - Gère le contenu dynamique (wait for selectors)

2. **Google Custom Search API** (`3-google-api-church-websites.js`)
   - Découvre les sites web officiels via recherche Google
   - Filtres intelligents (ignore annuaires, réseaux sociaux)
   - Rate limiting: 100 requêtes/jour gratuit

3. **ML Pattern Learning** (`ml-extractor.py` + benchmarks)
   - Améliore l'extraction horaires en apprenant des patterns
   - Benchmark sur églises test: 71% précision actuelle
   - Logs détaillés pour debug

### Ce qui reste à faire

#### 1. Finaliser l'intégration pipeline complet
```bash
# Flow cible:
messesinfo scrape → Google API discover → ML extract → validate → DB
```

**Fichiers à créer:**
- `pipeline-orchestrator.js` : coordonne les 3 étapes
- `db-integration.js` : insertion bulk dans Supabase
- `validation-layer.js` : checks avant insert

#### 2. Améliorer le ML extractor
- [ ] Entraîner sur plus d'églises (actuellement ~10 samples)
- [ ] Ajouter reconnaissance formats horaires variés:
  - "Messe dominicale 10h30"
  - "Samedi 18h (veillée)"
  - "Tous les jours 9h sauf lundi"
- [ ] Gérer les cas edge (horaires exceptionnels, vacances)

#### 3. Rate limiting Google API
- [ ] Queue système pour les 5000 églises
- [ ] Étalement sur plusieurs jours (100/jour max)
- [ ] Fallback si quota dépassé (DuckDuckGo scraping?)

#### 4. Monitoring & logs
- [ ] Dashboard progression (combien traité/jour)
- [ ] Alertes si extraction rate drop
- [ ] Logs structurés (JSON) pour analyse

### Comment reprendre

#### Setup local rapide
```bash
cd backend
cp .env.example .env
# Éditer .env avec tes clés API (Google CSE)

# Installer deps si besoin
npm install

# Tester le flow actuel
node scripts/1-scrape-messesinfo-fixed.js  # → data/messesinfo.json
node scripts/3-google-api-church-websites.js  # → découvre sites
python3 scripts/ml-extractor.py  # → améliore extraction
```

#### Fichiers importants

**Docs:**
- `MISSION_2_DELIVERY.md` : spec détaillée de la mission
- `GOOGLE_CUSTOM_SEARCH_SETUP.md` : setup API Google
- `WEBSITE_DISCOVERY_COMPARISON.md` : benchmark méthodes

**Scripts:**
- `1-scrape-messesinfo-fixed.js` : scraper principal
- `3-google-api-church-websites.js` : discovery sites
- `ml-extractor.py` : ML pattern learning
- `benchmark-improvements.py` : tests précision

**Data:**
- `data/messesinfo-sample.html` : exemple HTML source
- `data/test-single-church.json` : église test pour debug

### Prochaine étape recommandée

**Option A (rapide):** Tester le ML sur 50 églises réelles
```bash
# Modifier ml-extractor.py pour charger messesinfo.json
# Mesurer taux de succès actuel
# Identifier patterns manquants
```

**Option B (robuste):** Créer le pipeline orchestrator
```bash
# Créer pipeline-orchestrator.js
# Gérer queue + retry + logging
# Intégration Supabase
```

**Option C (scaling):** Setup queue Google API
```bash
# Bull/Redis pour queue 5000 églises
# Cron job quotidien (100/jour)
# Dashboard monitoring progression
```

### Notes technique

- **Google CSE quota:** 100/jour gratuit, puis 5$/1000
- **messesinfo.org:** ~5000 églises France
- **Temps estimé full scrape:** 50 jours (avec quota gratuit)
- **Alternative rapide:** payer 25$ → tout en 1 jour

### Questions ouvertes

1. On paie les 25$ ou on étale sur 50 jours?
2. On garde que les églises avec site web, ou on insert tout dans DB?
3. Fallback si site web pas trouvé → scrape réseaux sociaux (Facebook pages)?

---

**Commit actuel:** e443801
**Branch:** master
**Dernière modif:** 2026-04-05 04:11 UTC
