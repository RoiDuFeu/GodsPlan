# GodsPlan 🙏

**Trouvez des églises et horaires de messes à Paris**

Application web moderne pour découvrir les églises catholiques, consulter les horaires de messes, et trouver les sanctuaires proches de vous avec géolocalisation et itinéraires.

🌐 **Live:** https://godsplan.montparnas.fr  
📊 **Admin Dashboard:** https://godsplan.montparnas.fr/admindashboard

---

## 🚀 Stack Technique

### Frontend
- **React 18** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui components
- **Leaflet** pour la carte interactive
- **Chart.js** pour les graphiques admin
- **i18n** (Français / English)
- Dark mode support

### Backend
- **Node.js** + Express + TypeScript
- **PostgreSQL 16** + PostGIS (données géographiques)
- **TypeORM** (ORM)
- **PM2** (process manager)

### Scrapers
- **messes.info** → Horaires de messes
- **Google Maps HTML** → Téléphones, sites web, photos, ratings (sans API)
- **Nominatim** → Géocodage automatique (100% coverage GPS)

---

## 📦 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 16 + PostGIS
- PM2 (optionnel, pour production)

### 1. Clone & Install

```bash
git clone https://github.com/RoiDuFeu/GodsPlan.git
cd GodsPlan

# Backend
cd backend
npm install

# Frontend
cd ../web
npm install
```

### 2. Configuration Base de Données

```bash
# Créer l'utilisateur et la base
sudo -u postgres psql -p 5433 << EOF
CREATE USER godsplan WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE godsplan_db OWNER godsplan;
GRANT ALL PRIVILEGES ON DATABASE godsplan_db TO godsplan;
\c godsplan_db
CREATE EXTENSION IF NOT EXISTS postgis;
EOF
```

### 3. Configuration

**Backend `.env` :**
```bash
cd backend
cp .env.example .env  # Créer depuis le template ci-dessous
```

```env
PORT=3001
NODE_ENV=production
API_PREFIX=/api/v1

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=godsplan
POSTGRES_PASSWORD=votre_mot_de_passe
POSTGRES_DB=godsplan_db

# Scraping (optionnel)
GOOGLE_MAPS_API_KEY=
SCRAPE_USER_AGENT=GodsPlan/1.0 (contact@godsplan.app)
```

### 4. Build & Deploy

```bash
# Option A : Script automatique (recommandé)
chmod +x deploy-production.sh
./deploy-production.sh

# Option B : Manuel
cd backend && npm run build
cd ../web && npm run build
cp -r web/dist backend/public
cd backend
pm2 start npm --name "godsplan-api" -- run start
pm2 save
```

---

## 📊 Scraping & Population de la Base

### Scraper toutes les églises de Paris

```bash
cd backend
npm run scrape -- --with-messes
```

**Ce qui est scrapé :**
- ✅ 208 églises de Paris
- ✅ Horaires de messes (jour, heure, rite, langue)
- ✅ Coordonnées GPS (géocodage automatique si manquant)
- ✅ Téléphones, sites web (Google Maps)
- ✅ Photos haute résolution (Google Maps)
- ✅ Ratings et reviews (Google Maps)

**Temps estimé :** ~10-15 minutes

### Monitoring du scraping

```bash
# Dashboard CLI temps réel
npm run dashboard

# Voir les logs
pm2 logs godsplan-api

# Stats JSON (historique)
npm run stats
```

---

## 🌐 Déploiement Production

### Avec Cloudflare Tunnel

**Tunnels requis :**
- `godsplan.montparnas.fr` → `localhost:3001` (frontend + backend)
- `godsplan-api.montparnas.fr` → `localhost:3001` (API publique)

**Nginx (alternatif) :**

Voir `DEPLOYMENT.md` pour la config nginx complète.

---

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guide de déploiement complet
- **[ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md)** - Dashboard admin
- **[MONITORING_DASHBOARD.md](MONITORING_DASHBOARD.md)** - Monitoring CLI
- **[GEOCODING.md](backend/GEOCODING.md)** - Service de géocodage
- **[MODEL_ALIGNMENT.md](backend/MODEL_ALIGNMENT.md)** - Structure données

---

## 🔧 Développement

### Backend

```bash
cd backend
npm run dev  # Port 3001 avec hot-reload
```

### Frontend

```bash
cd web
npm run dev  # Port 5173 avec hot-reload
```

**API :** http://localhost:3001/api/v1  
**Frontend dev :** http://localhost:5173

---

## 🎯 Features

### Pour les utilisateurs
- 🗺️ **Carte interactive** de toutes les églises de Paris
- 📅 **Horaires de messes** détaillés (jour, heure, rite, langue)
- 📍 **Géolocalisation** et recherche à proximité
- 🧭 **Itinéraires** Google Maps
- 📞 **Contacts** (téléphone, site web)
- 📸 **Photos** des églises
- 🌙 **Dark mode**
- 🌍 **i18n** (FR/EN)

### Pour les admins
- 📊 **Dashboard** temps réel avec métriques
- 📈 **Graphiques** de couverture et qualité
- 🗺️ **Carte admin** avec marqueurs colorés par score
- ⚡ **Actions** : Scraping, Google Maps enrichment, Rapports
- 🔄 **Auto-refresh** 10s
- 📋 **Table** triable et filtrable

---

## 📊 Métriques Actuelles

| Métrique | Valeur |
|----------|--------|
| Églises total | 208 |
| Coordonnées GPS | 100% ✅ |
| Horaires de messes | ~70% |
| Téléphones | ~90% |
| Sites web | 100% ✅ |
| Photos | 100% ✅ |
| Score fiabilité moyen | 56-83/100 |

---

## 🤝 Contribution

1. Fork le projet
2. Crée une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'feat: Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvre une Pull Request

---

## 📝 License

MIT

---

## 👤 Auteur

**Marc** - [RoiDuFeu](https://github.com/RoiDuFeu)

**Avec l'aide de :** Artemis 🌙 (AI Assistant)

---

## 🙏 Remerciements

- [messes.info](https://www.messes.info) - Source principale des horaires
- Google Maps - Données enrichies (téléphones, photos, ratings)
- OpenStreetMap / Nominatim - Géocodage
- shadcn/ui - Composants UI
- Leaflet - Carte interactive
