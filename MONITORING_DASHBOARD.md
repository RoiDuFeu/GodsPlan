# 📊 Dashboard de Monitoring GodsPlan

## ✅ Livrables Complétés

### 1. Dashboard CLI (`scripts/dashboard.js`)
**Commande:** `npm run dashboard`

Affiche dans le terminal :
- 📊 Vue d'ensemble (total, actives, dernière mise à jour, score moyen)
- 🗺️ Couverture géographique (coordonnées GPS)
- 📅 Horaires de messes (pourcentage, total, moyenne)
- 📞 Informations de contact (téléphone, site web, email, photos)
- 📸 Médias (total photos, moyenne par église)
- 🔍 Sources de données (messes.info, Google Maps, mix)
- 🏆 Top 5 églises (meilleur score de fiabilité)
- ⚠️ Bottom 5 églises (plus bas score)
- 💡 Alertes et recommandations automatiques

**Temps d'exécution:** < 1 seconde ⚡

### 2. Générateur de Stats JSON (`scripts/generate-stats.js`)
**Commande:** `npm run stats`

Génère un fichier JSON horodaté dans `backend/data/stats-YYYY-MM-DD.json` avec :
```json
{
  "timestamp": "2026-03-27T16:04:22.560Z",
  "total": 10,
  "active": 10,
  "coverage": {
    "coordinates": 1.0,
    "schedules": 0.7,
    "phone": 0.8,
    "website": 1.0,
    "photos": 0.0
  },
  "avgSchedulesPerChurch": 2.2,
  "avgPhotosPerChurch": 0.0,
  "avgReliabilityScore": 83.3,
  "sources": {
    "messes.info": 0,
    "google-maps": 0,
    "both": 2
  }
}
```

**Usage custom:** `node scripts/generate-stats.js /path/custom/output.json`

### 3. Dashboard Web (`web/public/dashboard.html`) 🎁 BONUS

**Accès:** `http://localhost:5173/dashboard.html` (quand le serveur web tourne)

Fonctionnalités :
- 📊 Stats en temps réel (cards avec valeurs dynamiques)
- 📈 Graphique en barres de la couverture globale (Chart.js)
- 🥧 Graphique circulaire des sources de données
- 🗺️ Carte interactive (Leaflet) — prête pour affichage des églises
- ⚠️ Alertes automatiques sur les seuils critiques
- 🔄 Rafraîchissement auto toutes les 30 secondes

**Design:** Moderne, responsive, dégradé violet/bleu, animations smooth

### 4. API Endpoint Stats (`/api/v1/churches/stats`)

Ajouté dans `src/routes/churches.ts` :
- Route GET `/churches/stats`
- Renvoie les mêmes données que le générateur JSON
- Alimentation du dashboard web en temps réel

## 📂 Structure Créée

```
GodsPlan/
├── backend/
│   ├── scripts/
│   │   ├── dashboard.js          ✅ Dashboard CLI
│   │   ├── generate-stats.js     ✅ Générateur stats JSON
│   │   └── README.md             ✅ Documentation des scripts
│   ├── data/
│   │   └── stats-2026-03-27.json ✅ Snapshot actuel
│   ├── src/
│   │   └── routes/
│   │       └── churches.ts       ✅ Endpoint /stats ajouté
│   └── package.json              ✅ Scripts `dashboard` et `stats` ajoutés
└── web/
    └── public/
        └── dashboard.html        ✅ Dashboard web interactif
```

## 🚀 Comment Utiliser

### Dashboard CLI (rapide et pratique)
```bash
cd backend
npm run dashboard
```

### Générer un snapshot stats
```bash
cd backend
npm run stats
# ou avec chemin custom
node scripts/generate-stats.js ./data/stats-backup.json
```

### Dashboard Web
1. Démarrer l'API backend (si pas déjà fait) :
```bash
cd backend
npm run dev
```

2. Démarrer le frontend :
```bash
cd web
npm run dev
```

3. Ouvrir : `http://localhost:5173/dashboard.html`

### API Stats (pour intégrations externes)
```bash
curl http://localhost:3001/api/v1/churches/stats
```

## 🎯 Résultats Actuels (snapshot)

**Base de données actuelle :**
- Total églises : **10**
- Coordonnées GPS : **100%** ✅
- Horaires de messes : **70%**
- Téléphones : **80%**
- Sites web : **100%** ✅
- Photos : **0%** ⚠️

**Recommandations :**
1. ✅ Coordonnées GPS : Complètes !
2. 🔄 Enrichir avec scraper Google Maps pour photos/contacts
3. 🔄 Compléter horaires via API messes.info

## 🔧 Détails Techniques

### Technologies
- **CLI:** Node.js + pg (PostgreSQL direct, rapide)
- **Web:** Vanilla JS + Chart.js + Leaflet
- **API:** TypeScript + Express + TypeORM

### Performance
- Dashboard CLI : < 1 seconde
- API Stats : < 200ms
- Rafraîchissement web : toutes les 30s (configurable)

### Requêtes SQL Optimisées
Utilisation de :
- `jsonb_array_length()` pour compter les horaires/sources
- `FILTER (WHERE ...)` pour agrégations conditionnelles
- `::numeric(10,2)` pour précision décimale contrôlée

## 📝 Prochaines Étapes Possibles

1. **Historisation automatique**
   - Cron job quotidien pour `npm run stats`
   - Graphiques d'évolution temporelle

2. **Alertes proactives**
   - Email/Telegram si score moyen < seuil
   - Notification si baisse de couverture

3. **Carte interactive complète**
   - Charger les églises depuis l'API
   - Clustering pour performance
   - Filtres interactifs (rite, horaires, photos)

4. **Export PDF/Excel**
   - Rapports mensuels automatiques
   - Graphiques inclus

## 🎉 Mission Accomplie

Tous les livrables principaux sont fonctionnels :
- ✅ Dashboard CLI complet et rapide
- ✅ Générateur de stats JSON avec historisation
- ✅ Intégration package.json (`npm run dashboard/stats`)
- ✅ BONUS : Dashboard web moderne et interactif
- ✅ BONUS : Endpoint API `/stats`

Le monitoring est maintenant opérationnel et prêt à accompagner l'évolution du projet ! 📊🚀
