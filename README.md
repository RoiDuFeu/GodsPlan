# 🙏 God's Plan

Cross-platform application and website to discover churches in Paris with real-time mass schedules, rites, and services.

## 🎯 Vision

Help people find churches near them with accurate, up-to-date information about mass times, rites (Latin, French Paul VI, etc.), accessibility, and more.

## 🏗️ Architecture

**Monorepo structure:**

- `backend/` — Express + TypeScript API with automated scrapers
- `mobile/` — React Native + Expo cross-platform app
- `web/` — React web application
- `docker-compose.yml` — Local PostgreSQL + PostGIS setup

## 🗺️ Roadmap

### Phase 1: Backend & Data (Current)
- [x] Repository setup
- [ ] PostgreSQL + PostGIS database schema
- [ ] Express API with TypeScript
- [ ] Multi-source scrapers (Messes.info, Diocèse de Paris, etc.)
- [ ] Data reliability scoring system
- [ ] Daily automated scraping cron job

### Phase 2: Mobile & Web
- [ ] React Native + Expo mobile app
- [ ] Gluestack UI integration
- [ ] Interactive map with church markers
- [ ] Church detail pages with schedules
- [ ] Route planning integration
- [ ] User favorites & authentication
- [ ] Web version with same features

### Phase 3: Partnership & Admin
- [ ] Admin interface for dioceses to manage schedules directly
- [ ] Transition from scraping-only to hybrid model
- [ ] Expand to more cities

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/RoiDuFeu/GodsPlan.git
cd GodsPlan

# Start local database
docker-compose up -d

# Setup backend
cd backend
npm install
npm run dev
```

## 🛠️ Tech Stack

**Backend:**
- Express.js + TypeScript
- PostgreSQL + PostGIS (geospatial queries)
- TypeORM
- Puppeteer/Cheerio (scraping)

**Frontend:**
- React Native + Expo
- Gluestack UI
- React (web)
- MapBox/Google Maps integration

## 📦 Deployment

Starting on VPS, then dedicated machine as the project scales.

---

**Built with 🌙 by charbonneurs de l'espace**
