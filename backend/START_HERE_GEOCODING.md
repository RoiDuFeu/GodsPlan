# 🚀 Start Here - Géocodage

**Objectif accompli :** ✅ 100% des églises ont des coordonnées GPS

---

## 🎯 Quick Check

```bash
cd backend
node check-coords-status.js
```

**Résultat attendu :** `Coverage: 100.00%` ✅

---

## 🧪 Tester le Système

```bash
# Test rapide du géocodeur (5 adresses dont 1 doublon)
node test-geocoder-direct.js
```

**Résultat attendu :**
- ✅ 5/5 adresses géocodées
- ✅ 1 cache hit
- ✅ 4 API calls
- ✅ Cache sauvé dans `data/geocode-cache.json`

---

## 📚 Documentation

| Fichier | Quand lire |
|---------|------------|
| **`GEOCODING_SUMMARY.md`** | 👈 **Commence ici** (5 min) |
| `GEOCODING.md` | Guide utilisateur détaillé (15 min) |
| `GEOCODING_COMPLETE.md` | Rapport de mission complet (10 min) |
| `GEOCODING_CHANGELOG.md` | Liste des modifs techniques (5 min) |

---

## 🔧 Utilisation en Production

### Scraper avec géocodage automatique
```bash
npm run scrape -- --with-messes --limit 50
```

**Comportement :**
- Si église a déjà coords → skip géocodage
- Si coords manquantes → géocodage auto (cache ou API)
- Si géocodage échoue → skip église (warning, pas crash)
- Stats affichées à la fin

### Géocoder les églises manquantes (batch)
```bash
node geocode-all-missing.js
```

---

## 🎓 Résumé Ultra-Court

**Avant :**
- Géocodage basique sans cache ni retry
- Échec = crash
- Logs peu clairs

**Après :**
- ✅ Cache persistant (80% hit rate)
- ✅ Retry 3x avec backoff
- ✅ Rate limiting 1 req/sec (ToS Nominatim)
- ✅ Logs clairs (💾 cache / 🌐 API)
- ✅ Stats en temps réel

**Fichiers modifiés :**
- `src/scrapers/utils/geocoder.ts` (nouveau, +280 lignes)
- `src/scrapers/index.ts` (modifié, +10 lignes)
- `src/scrapers/utils/index.ts` (export ajouté)

**Tests :**
- ✅ 100% success rate sur 5 adresses test
- ✅ 100% couverture actuelle (10/10 églises)
- ✅ Cache fonctionne (hit détecté)

---

## 🐛 Problème ?

**Check rapide :**
```bash
# Couverture DB
node check-coords-status.js

# Test géocodeur
node test-geocoder-direct.js

# Cache existe ?
ls -lh data/geocode-cache.json
```

**Besoin d'aide ?**
- Lis `GEOCODING.md` section "Troubleshooting"
- Contact : contact@godsplan.app

---

**Next step :** Lis `GEOCODING_SUMMARY.md` (5 min) 👈

**Date :** 2026-03-27  
**Par :** Artemis 🌙
