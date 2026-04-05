# 🔍 Website Discovery - API vs Scraping Comparison

## Objectif

Trouver les sites web officiels de 400+ églises Île-de-France.

**Problème:** 95% des URLs en BDD = redirections messesinfo.fr/catholique.fr (inutiles).

**Solution:** Deux approches disponibles.

---

## 🔀 Deux Approches Disponibles

### Approche 1: Google Custom Search API (Nouveau ✨)

**Fichier:** `scripts/3-google-api-church-websites.js`

**Principe:**
- Utilise l'API officielle Google Custom Search
- Requête structurée → résultats JSON
- Filtrage automatique des domaines agrégateurs
- Scoring de confiance (0.0-1.0)

**Avantages:**
- ⭐⭐⭐⭐⭐ Stabilité (API officielle, pas de risque anti-bot)
- ⭐⭐⭐⭐⭐ Vitesse (1-2s par requête, parallélisable)
- ⭐⭐⭐⭐⭐ Qualité (ranking Google authentique)
- ⭐⭐⭐⭐ Rate limiting propre (1000ms suffit)
- ⭐⭐⭐⭐ Retry logic robuste (exponential backoff)

**Inconvénients:**
- ❌ Payant après 100 requêtes/jour ($5/1000)
- ❌ Setup Google Cloud nécessaire (API key + CX)

**Coût estimé:**
| Scénario | Requêtes | Coût |
|----------|----------|------|
| Test (50 églises) | 50 | $0 (gratuit) |
| Paris (~400) | ~300* | $1.00 |
| IDF (~2000) | ~1500* | $7.00 |

*Optimisé: skip églises avec URLs existantes valides

**Performance attendue:**
- Success rate: **60-70%** (églises avec site web)
- Vitesse: **~2s/église** (API + processing)
- Durée totale (400 églises): **~13 minutes**

---

### Approche 2: Puppeteer Scraping (Existant)

**Fichier:** `scripts/2-find-church-websites.js`

**Principe:**
- Lance navigateur headless (Puppeteer)
- Visite google.fr/search et parse HTML
- Extrait premier lien organique (hors agrégateurs)

**Avantages:**
- ⭐⭐⭐⭐⭐ Gratuit (pas de quota)
- ⭐⭐⭐⭐⭐ Pas de setup API
- ⭐⭐⭐⭐ Fonctionne offline (si cache DNS)

**Inconvénients:**
- ❌ Fragile (sélecteurs CSS changent, anti-bot Google)
- ❌ Lent (5-10s par requête, browser overhead)
- ❌ Rate limiting strict nécessaire (2s minimum, risque ban)
- ❌ Détectable (User-Agent, fingerprinting)

**Performance attendue:**
- Success rate: **50-60%** (dépend de l'anti-bot)
- Vitesse: **~7s/église** (browser + render)
- Durée totale (400 églises): **~47 minutes**

---

## 📊 Comparaison Détaillée

| Critère | Google API | Puppeteer Scraping |
|---------|------------|-------------------|
| **Coût** | $5/1000 après quota | Gratuit |
| **Setup** | ⭐⭐⭐ Moyen (Google Cloud) | ⭐⭐⭐⭐⭐ Simple (npm install) |
| **Stabilité** | ⭐⭐⭐⭐⭐ (API officielle) | ⭐⭐⭐ (anti-bot aléatoire) |
| **Vitesse** | ⭐⭐⭐⭐⭐ (1-2s/req) | ⭐⭐ (5-10s/req) |
| **Qualité** | ⭐⭐⭐⭐⭐ (ranking Google) | ⭐⭐⭐⭐ (premier résultat) |
| **Rate limiting** | ⭐⭐⭐⭐ (1s OK) | ⭐⭐⭐ (2s minimum) |
| **Parallélisation** | ⭐⭐⭐⭐⭐ (facile) | ⭐⭐ (complexe, browsers) |
| **Maintenance** | ⭐⭐⭐⭐⭐ (stable) | ⭐⭐ (sélecteurs cassent) |
| **Détection risque** | ⭐⭐⭐⭐⭐ (aucun) | ⭐⭐ (ban IP possible) |
| **Quota** | 100/jour gratuit | Illimité (mais détectable) |

---

## 🎯 Recommandations par Use Case

### Use Case 1: Test/Développement (< 100 églises)

**Recommandation:** ✅ **Google API**

**Pourquoi:**
- 100 requêtes/jour gratuites
- Pas de risque de ban
- Résultats fiables pour validation

**Command:**
```bash
node scripts/3-google-api-church-websites.js \
  --input data/test-50.json \
  --output data/test-enriched.json \
  --limit 50
```

---

### Use Case 2: Production Small Scale (400 églises Paris)

**Recommandation:** ✅ **Google API**

**Pourquoi:**
- Coût acceptable (~$1.50)
- Stabilité > coût pour production
- Vitesse importante (13min vs 47min)

**Command:**
```bash
node scripts/3-google-api-church-websites.js \
  --input data/idf-production/paris_only.json \
  --output data/paris_with_websites.json
```

**Optimisation:** Skip églises avec URLs valides existantes
```bash
# Filter d'abord les églises sans URL
jq '[.[] | select(.website == null or (.website | contains("messesinfo") or contains("catholique")))]' \
  data/paris_only.json > data/paris_missing_urls.json

# Recherche que pour celles-ci
node scripts/3-google-api-church-websites.js \
  --input data/paris_missing_urls.json \
  --output data/paris_found_urls.json

# Merge avec données originales
# (script merge à créer si besoin)
```

---

### Use Case 3: Production Large Scale (2000+ églises IDF)

**Recommandation:** 🔀 **Hybride (API + Puppeteer fallback)**

**Stratégie:**
1. Utiliser Google API pour 100 premières/jour (gratuit)
2. Fallback Puppeteer pour le reste
3. Cacher résultats déjà trouvés

**Workflow:**
```bash
# Jour 1: Google API (100 gratuites)
node scripts/3-google-api-church-websites.js \
  --input data/idf-all.json \
  --output data/idf-day1.json \
  --limit 100

# Jour 1 suite: Puppeteer pour le reste
node scripts/2-find-church-websites.js \
  --input data/idf-all.json \
  --output data/idf-day1-complete.json \
  --skip 100

# Jour 2: Repeat avec nouvelles 100 gratuites
# ...
```

**Coût estimé:**
- 2000 églises × 70% sans URL = ~1400 recherches
- Google API: 14 jours × 100 = 1400 gratuit
- **Coût total: $0** (patience)

Ou payant immédiat:
- 1400 - 100 = 1300 payantes
- **Coût: $6.50** (traitement en 1-2h)

---

### Use Case 4: Budget Zero (Startup/MVP)

**Recommandation:** ⭐ **Puppeteer only**

**Pourquoi:**
- Pas de frais
- Acceptable pour MVP
- Peut évoluer vers API plus tard

**Risques à mitiger:**
- Rate limiting strict (2-3s minimum)
- Retry logic robuste
- Rotation User-Agent
- Accepter 10-20% d'échecs

**Command:**
```bash
node scripts/2-find-church-websites.js \
  --input data/churches.json \
  --output data/enriched.json \
  --rate-limit 3000 \
  --headless true
```

---

## 🛠️ Optimisations Communes

Quelle que soit l'approche:

### 1. Skip églises avec URLs valides

```javascript
// Filter avant traitement
const toProcess = churches.filter(c => {
  if (!c.website) return true;
  
  const excludedDomains = ['messesinfo', 'catholique', 'eglise.catholique'];
  return excludedDomains.some(d => c.website.includes(d));
});
```

### 2. Cache résultats

```javascript
// Sauvegarder résultats intermédiaires
fs.writeFileSync(
  `data/cache/batch-${Date.now()}.json`,
  JSON.stringify(results)
);
```

### 3. Batch processing avec resume

```javascript
// Permettre de reprendre après crash
const processed = loadCache('last-batch.json') || [];
const remaining = churches.filter(c => 
  !processed.some(p => p.name === c.name && p.city === c.city)
);
```

### 4. Logging détaillé

```javascript
// Log chaque recherche pour debug
const log = {
  timestamp: new Date(),
  church: church.name,
  query: searchQuery,
  result: website,
  confidence: score
};

fs.appendFileSync('data/search-log.jsonl', JSON.stringify(log) + '\n');
```

---

## 🚀 Migration Path: Puppeteer → Google API

Si vous démarrez avec Puppeteer et voulez migrer:

### Étape 1: Setup Google API
```bash
# Suivre GOOGLE_CUSTOM_SEARCH_SETUP.md
# Ajouter credentials à .env
```

### Étape 2: Test comparatif
```bash
# Test sur 10 églises avec les deux méthodes
node scripts/2-find-church-websites.js -i test10.json -o puppeteer.json --limit 10
node scripts/3-google-api-church-websites.js -i test10.json -o api.json --limit 10

# Comparer résultats
diff <(jq -S . puppeteer.json) <(jq -S . api.json)
```

### Étape 3: Migration progressive
```bash
# Utiliser API pour nouvelles recherches
# Garder résultats Puppeteer existants (évite re-recherche)
```

---

## 📈 Success Metrics

Objectif commun (quelle que soit l'approche):

| Métrique | Cible | Méthode Mesure |
|----------|-------|----------------|
| **Success rate** | ≥50% | (websites found / total) × 100 |
| **Valid URLs** | ≥90% | URLs HTTP 200 / total found |
| **No aggregators** | 100% | messesinfo/catholique exclus |
| **Avg confidence** | ≥0.6 | Score moyen (API only) |
| **Processing time** | <30min/400 | Temps total batch |

**Validation:**
```bash
# Compter succès
jq '[.[] | select(.website != null)] | length' results.json

# Vérifier pas d'agrégateurs
jq '.[] | select(.website != null) | .website' results.json | \
  grep -E "messesinfo|catholique" && echo "❌ Aggregators found!" || echo "✅ Clean"

# Success rate
SUCCESS=$(jq '[.[] | select(.website != null)] | length' results.json)
TOTAL=$(jq 'length' results.json)
echo "Success rate: $((SUCCESS * 100 / TOTAL))%"
```

---

## 🎯 Decision Matrix

**Choisir Google API si:**
- ✅ Budget OK ($1-10)
- ✅ Vitesse importante
- ✅ Production (stabilité > coût)
- ✅ Volume moyen (<5000 requêtes/mois)

**Choisir Puppeteer si:**
- ✅ Budget zéro
- ✅ Temps pas critique
- ✅ Volume faible (<100/mois)
- ✅ Setup Google Cloud impossible

**Choisir Hybride si:**
- ✅ Volume élevé (>5000 requêtes)
- ✅ Budget limité mais pas zéro
- ✅ Tolérance aux échecs OK

---

## 📝 Conclusion

**Pour GodsPlan MVP (400 églises Paris):**

👉 **Recommandation: Google Custom Search API**

**Raison:**
- Coût acceptable (~$1.50)
- Vitesse cruciale pour UX (13min vs 47min)
- Stabilité importante pour production
- Setup Google Cloud: investissement une fois, utile long terme

**Fallback Puppeteer disponible** si:
- Quota dépassé (rare à cette échelle)
- Problème API (maintenance Google)
- Budget devient bloquant

**Next action:** Setup Google API (GOOGLE_CUSTOM_SEARCH_SETUP.md)

---

**Dernière mise à jour:** 2026-04-05  
**Auteur:** Artemis (GodsPlan ML Pipeline)
