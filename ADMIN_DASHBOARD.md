# 📊 Admin Dashboard - God's Plan

## Accès

**URL :** https://godsplan.montparnas.fr/admindashboard

Le dashboard admin est accessible directement via l'URL ci-dessus. Pas besoin de React Router, on utilise un simple système de routing basé sur `window.location.pathname`.

## Fonctionnalités

### 1️⃣ **Métriques clés** (Cards en haut)
- 📊 Total églises (208)
- 🗺️ Coordonnées GPS (100% ✅)
- 📅 Horaires de messes (70%)
- 📞 Contacts téléphone (80%)

### 2️⃣ **Graphiques interactifs** (Chart.js)
- **Bar Chart** : Coverage par type de données (GPS, horaires, téléphone, site web, photos)
- **Pie Chart** : Répartition par score de fiabilité
  - Excellent (>90) - Vert
  - Bon (70-90) - Bleu
  - Moyen (50-70) - Jaune
  - Faible (<50) - Rouge

### 3️⃣ **Carte interactive** (Leaflet)
- Affiche toutes les églises de Paris sur OpenStreetMap
- Marqueurs personnalisés colorés par score de fiabilité :
  - 🟢 Vert : score > 80
  - 🟠 Orange : score 50-80
  - 🔴 Rouge : score < 50
- Popup au clic avec : nom, score, nombre d'horaires, téléphone

### 4️⃣ **Table des églises**
- Liste complète avec tri dynamique (cliquer sur les en-têtes)
- Colonnes : Nom, Score, GPS, Horaires, Téléphone, Site, Photos
- Actions : Voir détails, Forcer re-scrape

### 5️⃣ **Actions admin**
- 🔄 Lancer scraping complet
- 🗺️ Enrichir avec Google Maps (placeholder)
- 📊 Générer rapport qualité (placeholder)
- 🧹 Nettoyer données obsolètes (placeholder)

### 6️⃣ **Auto-refresh temps réel**
- ⚡ Polling API toutes les 10 secondes
- Badge "Live" avec indicateur pulsant
- Timestamp dernière mise à jour
- Bouton "Actualiser" manuel

## API Endpoints

### GET `/api/v1/admin/stats`
Retourne les statistiques complètes :
```json
{
  "timestamp": "2026-03-27T16:20:00Z",
  "total": 208,
  "active": 208,
  "coverage": {
    "gps": { "count": 208, "percent": 100 },
    "schedules": { "count": 145, "percent": 70 },
    "phone": { "count": 166, "percent": 80 },
    "website": { "count": 208, "percent": 100 },
    "photos": { "count": 10, "percent": 5 }
  },
  "avgSchedulesPerChurch": 2.2,
  "avgReliabilityScore": 83,
  "reliabilityDistribution": {
    "excellent": 50,
    "good": 100,
    "fair": 50,
    "poor": 8
  },
  "recentlyUpdated": [...]
}
```

### GET `/api/v1/admin/churches-map`
Retourne les données pour la carte :
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Église Saint-Eustache",
      "lat": 48.8566,
      "lng": 2.3522,
      "score": 85.5,
      "schedulesCount": 3,
      "phone": "+33 1 23 45 67 89"
    }
  ],
  "meta": {
    "total": 208,
    "timestamp": "2026-03-27T16:20:00Z"
  }
}
```

### POST `/api/v1/admin/scrape`
Déclenche un scraping manuel (placeholder pour l'instant) :
```json
{
  "status": "queued",
  "message": "Scraping job queued successfully",
  "timestamp": "2026-03-27T16:20:00Z"
}
```

## Structure des fichiers

### Backend
```
backend/src/routes/
  ├── admin-stats.ts       # Nouveau ! Routes admin
  ├── churches.ts          # Routes existantes
  └── churches-simple.ts   # Routes existantes

backend/src/index.ts       # ✅ Modifié pour inclure adminStatsRoutes
```

### Frontend
```
web/src/
  ├── pages/
  │   └── AdminDashboard.tsx         # Page principale admin
  ├── components/admin/
  │   ├── CoverageChart.tsx          # Bar chart coverage
  │   ├── ReliabilityPieChart.tsx    # Pie chart fiabilité
  │   ├── ChurchesMap.tsx            # Carte Leaflet
  │   └── ChurchesTable.tsx          # Table triable
  ├── components/ui/
  │   └── table.tsx                  # Nouveau ! Composant shadcn/ui
  ├── AppRouter.tsx                  # Nouveau ! Simple routing
  ├── App.tsx                        # App principale existante
  └── main.tsx                       # ✅ Modifié pour utiliser AppRouter
```

## Dépendances ajoutées

```bash
npm install chart.js react-chartjs-2 leaflet react-leaflet @types/leaflet
```

## Design

- ✅ Stack existante : React + Vite + TypeScript + Tailwind
- ✅ Composants shadcn/ui réutilisés : Card, Badge, Button, Separator, etc.
- ✅ Dark mode compatible (via ThemeProvider existant)
- ✅ Responsive mobile-friendly
- ✅ Icons Lucide React
- ✅ Gradients subtils et animations fluides

## Développement local

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd web
npm run dev
```

Ensuite ouvrir : http://localhost:5173/admindashboard

## Production

Le dashboard est accessible sur :
**https://godsplan.montparnas.fr/admindashboard**

Configuration nginx requise pour servir `/admindashboard` :
```nginx
location /admindashboard {
  try_files $uri /index.html;
}
```

## TODO Future

- [ ] Implémenter vraie logique de scraping dans `POST /admin/scrape`
- [ ] Ajouter authentification basique (username/password)
- [ ] Implémenter enrichissement Google Maps
- [ ] Génération rapport qualité (export PDF/CSV)
- [ ] Nettoyage données obsolètes
- [ ] Historique des évolutions (line chart avec données temporelles)
- [ ] Notifications en cas d'erreurs de scraping

## Notes

- Auto-refresh 10s : peut être désactivé/ajusté dans `AdminDashboard.tsx` (ligne `setInterval`)
- Carte centrée sur Paris : coordonnées `[48.8566, 2.3522]`
- Leaflet markers : couleurs dynamiques basées sur score
- Table : tri par nom ou score, extensible facilement

---

**Dashboard créé le :** 2026-03-27  
**Par :** Artemis 🌙  
**Pour :** God's Plan - Monitoring & Analytics  
