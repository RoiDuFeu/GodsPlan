# 📂 Fichiers Géocodage - Navigation Rapide

## 🎯 Point d'Entrée

**👉 Commence ici :** `START_HERE_GEOCODING.md` (2 min)

---

## 📚 Documentation (lis dans cet ordre)

1. **`START_HERE_GEOCODING.md`** - Point d'entrée ultra-court (2 min)
2. **`GEOCODING_SUMMARY.md`** - Résumé exécutif (5 min)
3. **`GEOCODING.md`** - Guide utilisateur complet (15 min)
4. **`GEOCODING_COMPLETE.md`** - Rapport de mission détaillé (10 min)
5. **`GEOCODING_CHANGELOG.md`** - Liste des modifications techniques (5 min)
6. **`REPORT_GEOCODING.txt`** - Rapport final ASCII (lecture rapide)

---

## 💻 Code Source

### Nouveau Code

```
backend/
├── src/
│   └── scrapers/
│       ├── utils/
│       │   └── geocoder.ts                    🆕 Service géocodage principal
│       └── test-geocoding.ts                  🆕 Tests TypeScript
```

### Code Modifié

```
backend/
├── src/
│   └── scrapers/
│       ├── index.ts                           ✏️ Intégration géocodage
│       └── utils/
│           └── index.ts                       ✏️ Export geocoder ajouté
```

---

## 🧪 Scripts de Test & Maintenance

Tous dans `backend/` (racine) :

```
backend/
├── test-geocoder-direct.js        🆕 Test rapide JS (pas de build TS)
├── check-coords-status.js         🆕 Vérif couverture GPS en DB
├── geocode-all-missing.js         🆕 Batch géocodage églises manquantes
└── check-coords.sql               🆕 Requête SQL vérif couverture
```

**Usage :**

```bash
# Test géocodeur
node test-geocoder-direct.js

# Check couverture
node check-coords-status.js

# Batch géocodage
node geocode-all-missing.js
```

---

## 📦 Data

```
backend/
└── data/
    └── geocode-cache.json          🆕 Cache persistant (4 entrées actuelles)
```

**Format :**
```json
{
  "adresse normalisée": {
    "lat": 48.826,
    "lng": 2.377,
    "cachedAt": "2026-03-27T15:44:12.591Z"
  }
}
```

---

## 🔨 Build Output (compilé)

```
backend/
└── dist/
    └── scrapers/
        ├── test-geocoding.js              Compilé depuis src/
        ├── test-geocoding.d.ts
        └── utils/
            ├── geocoder.js                Compilé depuis src/
            └── geocoder.d.ts
```

---

## 📊 Arborescence Complète

```
backend/
├── 📚 Documentation (lire en premier)
│   ├── START_HERE_GEOCODING.md              👈 Commence ici
│   ├── GEOCODING_SUMMARY.md                 Résumé exécutif
│   ├── GEOCODING.md                         Guide utilisateur
│   ├── GEOCODING_COMPLETE.md                Rapport de mission
│   ├── GEOCODING_CHANGELOG.md               Liste modifs techniques
│   ├── REPORT_GEOCODING.txt                 Rapport final ASCII
│   └── FILES_GEOCODING.md                   Ce fichier
│
├── 💻 Code Source (src/)
│   └── scrapers/
│       ├── utils/
│       │   ├── geocoder.ts                  🆕 Service géocodage
│       │   └── index.ts                     ✏️ Export geocoder
│       ├── index.ts                         ✏️ Intégration pipeline
│       └── test-geocoding.ts                🆕 Tests TypeScript
│
├── 🧪 Scripts de Test (racine backend/)
│   ├── test-geocoder-direct.js              🆕 Test JS rapide
│   ├── check-coords-status.js               🆕 Vérif couverture DB
│   ├── geocode-all-missing.js               🆕 Batch géocodage
│   └── check-coords.sql                     🆕 Requête SQL
│
├── 📦 Data
│   └── data/
│       └── geocode-cache.json               🆕 Cache persistant
│
└── 🔨 Build Output (dist/)
    └── scrapers/
        ├── test-geocoding.{js,d.ts}         Compilé
        └── utils/
            └── geocoder.{js,d.ts}           Compilé
```

---

## 🎯 Quick Actions

| Action | Commande |
|--------|----------|
| **Lire la doc** | `cat START_HERE_GEOCODING.md` |
| **Test rapide** | `node test-geocoder-direct.js` |
| **Check DB** | `node check-coords-status.js` |
| **Batch géocodage** | `node geocode-all-missing.js` |
| **Voir cache** | `cat data/geocode-cache.json` |
| **Compiler TS** | `npm run build` |
| **Scraper avec géocodage** | `npm run scrape -- --with-messes --limit 50` |

---

## 📈 Statistiques

| Catégorie | Nombre |
|-----------|--------|
| Documentation | 7 fichiers (~25 pages) |
| Code TypeScript | 2 fichiers (+291 lignes) |
| Scripts JS | 4 fichiers |
| Data | 1 cache JSON |
| Build output | Auto-généré |
| **Total livrables** | **14 fichiers** |

---

## 🔍 Rechercher un Fichier

**Par nom :**
```bash
find . -name "*geocod*" 2>/dev/null
```

**Par contenu :**
```bash
grep -r "getGeocoder" src/
```

**Documentation :**
```bash
ls -1 | grep -i "GEOCOD"
```

---

## 📝 Notes

- Tous les fichiers `GEOCODING_*.md` sont dans `backend/` (racine)
- Les scripts JS sont aussi dans `backend/` (racine)
- Le code source est dans `src/scrapers/utils/geocoder.ts`
- Le cache est dans `data/geocode-cache.json` (créé auto)

---

**Navigation recommandée :**

1. Lire `START_HERE_GEOCODING.md` (2 min)
2. Tester `node test-geocoder-direct.js` (30 sec)
3. Lire `GEOCODING_SUMMARY.md` (5 min)
4. Explorer le code `src/scrapers/utils/geocoder.ts`

🌙 Bon code !
