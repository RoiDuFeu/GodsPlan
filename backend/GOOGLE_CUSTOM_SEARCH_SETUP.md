# 🔍 Google Custom Search API - Setup Guide

## Objectif

Utiliser l'API officielle Google pour trouver les sites web officiels des églises.

**Avantages vs scraping Puppeteer:**
- ✅ Plus stable (API officielle)
- ✅ Plus rapide (pas de browser)
- ✅ Meilleur rate limiting
- ✅ Résultats de qualité (ranking Google)

**Inconvénients:**
- ❌ Payant après 100 requêtes/jour
- ❌ Nécessite setup Google Cloud

---

## 📋 Setup Instructions (Step-by-Step)

### 1. Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquer sur **"Select a project"** → **"New Project"**
3. Nom du projet: `GodsPlan-Search` (ou autre)
4. Cliquer **"Create"**
5. Attendre la création (~30 secondes)

---

### 2. Activer l'API Custom Search

1. Dans le menu de gauche: **APIs & Services** → **Library**
2. Chercher: `Custom Search API`
3. Cliquer sur **"Custom Search API"**
4. Cliquer **"Enable"**
5. Attendre l'activation (~10 secondes)

---

### 3. Créer une clé API

1. Dans le menu de gauche: **APIs & Services** → **Credentials**
2. Cliquer **"+ CREATE CREDENTIALS"** → **"API Key"**
3. Une fenêtre s'ouvre avec votre clé API
4. **Copier la clé** (format: `AIzaSyD...`)
5. (Optionnel) Cliquer **"Restrict Key"** pour sécuriser:
   - **API restrictions** → "Restrict key" → Cocher **"Custom Search API"**
   - Sauvegarder

**⚠️ Sécurité:** Ne jamais commit la clé API dans Git ! Elle doit rester dans `.env` (ignoré).

---

### 4. Créer un Custom Search Engine

1. Aller sur [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Cliquer **"Add"** ou **"Get started"**
3. Configuration:
   - **What to search:** "Search the entire web"
   - **Name:** `GodsPlan Church Finder`
   - Cocher **"Search the entire web"**
4. Cliquer **"Create"**
5. Sur la page suivante, cliquer **"Customize"**
6. Dans la section **"Basics"**, copier le **"Search engine ID"** (format: `a1b2c3d4e5f...`)

**Important:** Le Search Engine ID est différent de l'API Key !

---

### 5. Configuration .env

Ajouter dans `/home/ocadmin/.openclaw/workspace/GodsPlan/backend/.env`:

```bash
# Google Custom Search API
GOOGLE_API_KEY=AIzaSyD_VOTRE_CLE_ICI
GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5f_VOTRE_CX_ICI
```

**Vérification:**
```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend
cat .env | grep GOOGLE
```

Devrait afficher vos deux variables.

---

## 🧪 Test Setup

Test rapide avec une église:

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Créer un fichier test avec 1 église
echo '[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "postal_code": "75006"
  }
]' > data/test-single-church.json

# Lancer le script
node scripts/3-google-api-church-websites.js \
  --input data/test-single-church.json \
  --output data/test-result.json
```

**Résultat attendu:**
```
✅ Loaded 1 churches from data/test-single-church.json
🔍 Finding official websites via Google Custom Search API
[1/1] Église Saint-Sulpice
  ✅ Found: https://www.stsulpice.com (confidence: 85%)

📊 Website Discovery Summary (Google API)
✅ Churches processed: 1
🌐 Websites found: 1/1 (100%)
💾 Saved to: data/test-result.json
```

**Si erreur "Invalid API key":**
- Vérifier que la clé est bien dans `.env`
- Vérifier que Custom Search API est activée
- Attendre 1-2 minutes (propagation)

**Si erreur "Invalid cx":**
- Vérifier le Search Engine ID dans `.env`
- S'assurer que "Search the entire web" est activé

---

## 💰 Pricing & Quotas

### Gratuit
- **100 requêtes/jour**
- Parfait pour tester et développer

### Payant
- **$5 USD pour 1000 requêtes** (au-delà de 100/jour)
- Maximum: 10,000 requêtes/jour

### Estimation pour GodsPlan

| Scénario | Églises | Coût |
|----------|---------|------|
| Test (50 églises) | 50 | $0 (gratuit) |
| Paris only (~400) | 400 | ~$1.50 |
| Île-de-France (~2000) | 2000 | ~$9.50 |
| France entière (~15,000) | 15,000 | ~$72.50 |

**Note:** On peut optimiser en:
1. Ne recherchant que les églises sans URL valide
2. Cachant les résultats déjà trouvés
3. Utilisant le fallback Puppeteer pour les quotas dépassés

---

## 📊 Comparaison: Google API vs Puppeteer Scraping

| Critère | Google API | Puppeteer Scraping |
|---------|------------|-------------------|
| **Coût** | $5/1000 (après 100/jour) | Gratuit |
| **Stabilité** | ⭐⭐⭐⭐⭐ (API officielle) | ⭐⭐⭐ (fragile, anti-bot) |
| **Vitesse** | ⭐⭐⭐⭐⭐ (1-2s/requête) | ⭐⭐ (5-10s/requête) |
| **Qualité résultats** | ⭐⭐⭐⭐⭐ (ranking Google) | ⭐⭐⭐⭐ (HTML parsing) |
| **Rate limiting** | ⭐⭐⭐⭐ (1000ms OK) | ⭐⭐⭐ (2000ms minimum) |
| **Setup complexity** | ⭐⭐⭐ (Google Cloud) | ⭐⭐⭐⭐⭐ (npm install) |
| **Quota** | 100/jour gratuit | Illimité (mais détectable) |

**Recommandation:**
- **Dev/Test:** Google API (100/jour gratuit)
- **Production (petite échelle):** Google API (<$10/mois)
- **Production (large échelle):** Puppeteer avec proxy rotation

---

## 🚀 Usage en Production

### Test sur 50 églises

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Avec limite (ne traite que 50 premières)
node scripts/3-google-api-church-websites.js \
  --input data/idf-production/paris_only.json \
  --output data/paris_50_with_urls.json \
  --limit 50
```

### Production complète (400+ églises Paris)

```bash
# Traiter toutes les églises sans URL valide
node scripts/3-google-api-church-websites.js \
  --input data/idf-production/paris_only.json \
  --output data/idf-production/paris_enriched_urls.json \
  --rate-limit 1000

# Coût estimé: ~$1.50 (si >100 églises sans URL)
```

### Fallback hybride (API + Puppeteer)

Si quota dépassé, utiliser Puppeteer en fallback:

```bash
# 1. Essayer Google API (100 premières)
node scripts/3-google-api-church-websites.js \
  --input data/churches.json \
  --output data/churches_api.json \
  --limit 100

# 2. Compléter avec Puppeteer pour le reste
node scripts/2-find-church-websites.js \
  --input data/churches_api.json \
  --output data/churches_complete.json \
  --skip-existing
```

---

## 🐛 Troubleshooting

### Erreur: "Missing Google API credentials"

```bash
# Vérifier .env
cat /home/ocadmin/.openclaw/workspace/GodsPlan/backend/.env | grep GOOGLE

# Doit afficher:
# GOOGLE_API_KEY=AIza...
# GOOGLE_SEARCH_ENGINE_ID=a1b2c3...
```

### Erreur: "quota exceeded"

**Solution:** Attendre le lendemain (reset quota à minuit Pacific Time) ou activer billing.

### Erreur: "Rate limit exceeded"

**Solution:** Le script a un retry automatique avec backoff exponentiel. Patience !

### Faible taux de succès (<50%)

**Causes possibles:**
1. Églises ont peu/pas de présence web
2. Noms d'églises trop génériques
3. Requêtes de recherche mal formées

**Solutions:**
- Ajuster les mots-clés de recherche
- Utiliser adresse complète dans query
- Lowerer le seuil de confidence (actuellement 0.5)

---

## 📝 Next Steps

Après setup:

1. ✅ Test sur 1 église (vérifier credentials)
2. ✅ Test sur 50 églises (valider taux de succès)
3. 🔄 Optimiser requêtes si taux <50%
4. 🚀 Production run sur 400+ églises
5. 📊 Analyser résultats + import en BDD

---

**Créé:** 2026-04-05  
**Auteur:** Artemis (GodsPlan ML Pipeline)  
**Status:** ✅ Ready for testing
