# 🕷️ MessesInfo.fr Parser

Parser Python pour extraire les données d'églises depuis messesinfo.fr.

## Installation

Le parser utilise **Scrapling** (déjà installé dans le workspace venv):

```bash
# Vérifier l'installation
/home/ocadmin/.openclaw/workspace/.venv/bin/python -c "import scrapling; print('✅ Scrapling OK')"
```

## Usage

### Option 1: Wrapper Bash (recommandé)

```bash
cd /home/ocadmin/.openclaw/workspace/GodsPlan/backend

# Scraper 20 églises à Paris
./scripts/run-messesinfo-scraper.sh --city Paris --limit 20

# Scraper Lyon avec output custom
./scripts/run-messesinfo-scraper.sh --city Lyon --limit 50 --output data/lyon_churches.json

# Ralentir le rate limit (2s entre requêtes)
./scripts/run-messesinfo-scraper.sh --city Marseille --limit 30 --rate-limit 2.0
```

### Option 2: Python direct

```bash
/home/ocadmin/.openclaw/workspace/.venv/bin/python scripts/1-scrape-messesinfo.py --city Paris --limit 20
```

## Options

| Option | Description | Défaut |
|--------|-------------|--------|
| `--city` | Ville à scraper (Paris, Lyon, etc.) | **Requis** |
| `--limit` | Nombre max d'églises | 20 |
| `--output` | Chemin fichier JSON de sortie | `data/messesinfo_<city>_<date>.json` |
| `--rate-limit` | Délai entre requêtes (secondes) | 1.0 |
| `--timeout` | Timeout requête HTTP (secondes) | 20 |

## Format de sortie

```json
[
  {
    "name": "Église Saint-Sulpice",
    "city": "Paris",
    "street": "2 Rue Palatine",
    "postal_code": "75006",
    "latitude": 48.8510,
    "longitude": 2.3348,
    "mass_times": [
      {"day": "Dimanche", "time": "09:00"},
      {"day": "Dimanche", "time": "11:00"},
      {"day": "Dimanche", "time": "18:30"},
      {"day": "Samedi", "time": "18:00"}
    ],
    "phone": "01 42 34 59 98",
    "email": "paroisse@stsulpice.com",
    "messesinfo_url": "https://www.messesinfo.fr/eglise/75006-paris-saint-sulpice",
    "extraction_confidence": 0.85
  }
]
```

### Champs extraits

| Champ | Type | Description |
|-------|------|-------------|
| `name` | string | Nom de l'église |
| `city` | string | Ville |
| `street` | string? | Adresse (rue) |
| `postal_code` | string? | Code postal (extrait de l'URL) |
| `latitude` | float? | Latitude GPS |
| `longitude` | float? | Longitude GPS |
| `mass_times` | array | Horaires de messes (jour + heure) |
| `phone` | string? | Téléphone |
| `email` | string? | Email de contact |
| `messesinfo_url` | string | URL source sur messesinfo.fr |
| `extraction_confidence` | float | Score de confiance (0.0-1.0+) |

**Note:** Les champs marqués `?` peuvent être `null` si non trouvés dans le HTML.

## Tests

### Tests unitaires (avec mocks)

```bash
/home/ocadmin/.openclaw/workspace/.venv/bin/python tests/manual_test_parser.py
```

Les tests utilisent des fichiers HTML locaux (`tests/sample_*.html`) pour valider la logique de parsing.

### Test en conditions réelles

⚠️ **messesinfo.fr est actuellement inaccessible** (erreur de connexion).

Une fois le site accessible:

```bash
# Test sur 5 églises à Paris
./scripts/run-messesinfo-scraper.sh --city Paris --limit 5
```

## Résolution de problèmes

### Erreur: "Scrapling not found"

```bash
cd /home/ocadmin/.openclaw/workspace
.venv/bin/pip install scrapling
```

### Erreur: "Failed to connect to www.messesinfo.fr"

Le site est actuellement inaccessible. Options:

1. Réessayer plus tard
2. Utiliser un proxy/VPN
3. Vérifier la configuration réseau

### Trop d'erreurs HTTP 429 (rate limit)

Augmenter le délai entre requêtes:

```bash
./scripts/run-messesinfo-scraper.sh --city Paris --rate-limit 2.0
```

## Architecture du code

```
scripts/
├── 1-scrape-messesinfo.py           # Parser principal
└── run-messesinfo-scraper.sh        # Wrapper bash

tests/
├── manual_test_parser.py            # Tests avec HTML local
├── sample_messesinfo.html           # Mock: listing d'églises
└── sample_church_detail.html        # Mock: détails d'une église

data/
└── messesinfo_<city>_<date>.json    # Output scraped data
```

### Classes principales

#### `MessesInfoParser`

**Méthodes publiques:**

- `search_churches(city, limit)` → Liste d'églises avec détails complets
  - Fetch listing page
  - Parse URLs d'églises
  - Fetch détails pour chaque église

**Méthodes internes:**

- `_fetch_html(url)` → HTML brut avec rate limiting
- `_parse_church_listings(html, city, base_url)` → Extract church URLs
- `_fetch_church_details(url)` → Extract address, coords, mass times
- `_extract_mass_times(html)` → Parse schedule avec regex
- `_normalize_day(day_str)` → Normalise noms de jours FR

## Patterns de parsing

### URLs d'églises

```regex
/eglise/(\d{5})-([a-z-]+)
       ↑         ↑
   postal_code  slug
```

Exemple: `/eglise/75006-paris-saint-sulpice`

### Horaires de messes

```regex
<strong>(Jour)</strong> : 9h00, 11h00
```

Extrait:
- Jour: Dimanche, Samedi, Lundi, etc.
- Heures: 9h00 → 09:00, 18h30 → 18:30

### Coordonnées GPS

```html
<div data-lat="48.8510" data-lng="2.3348"></div>
```

### Contact

```regex
Téléphone\s*:\s*([0-9\s.]+)
([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})
```

## Confidence score

Le score de confiance (`extraction_confidence`) est calculé:

```
confidence = 0.3 (base)
  + 1.0 si mass_times présents
  + 0.3 si adresse présente
  + 0.2 si coordonnées GPS présentes
  + 0.2 si contact (phone OU email) présent

Max théorique: 1.7 (tous les champs remplis)
```

**Seuils recommandés:**

- `< 0.5` : Données incomplètes, vérifier manuellement
- `0.5 - 0.8` : Acceptable
- `> 0.8` : Excellente qualité

## Pipeline d'intégration

Une fois les données scrapées, elles peuvent être:

1. **Enrichies** avec le ML extractor (voir `ML_EXTRACTOR.md`)
2. **Importées** en BDD Postgres (script TypeScript à créer)
3. **Validées** manuellement (échantillon)
4. **Re-crawlées** périodiquement (freshness)

### Workflow recommandé

```bash
# 1. Scrape messesinfo.fr
./scripts/run-messesinfo-scraper.sh --city Paris --limit 100 --output data/paris_raw.json

# 2. Enrichir avec ML (si URLs de sites trouvées)
# ./scripts/run-ml-extractor.sh --batch data/paris_raw.json --output data/paris_enriched.json

# 3. Import en BDD (TODO)
# npm run import:churches data/paris_enriched.json

# 4. Validation
# npm run validate:sample 20
```

## Roadmap

- [ ] Fix SSL/connection issues avec messesinfo.fr
- [ ] Support des départements français (01-95)
- [ ] Parser les confessions (en plus des messes)
- [ ] Support des événements (concerts, pèlerinages)
- [ ] Améliorer patterns regex (adresses postales)
- [ ] Déduplication d'églises (même nom + ville)
- [ ] Export formats supplémentaires (CSV, SQL)
- [ ] Crawling incrémental (delta updates)

## Contributeurs

- **Artemis** (GodsPlan ML Pipeline)
- Créé: 2026-04-05

---

**Licence:** MIT  
**Repo:** GodsPlan Backend
