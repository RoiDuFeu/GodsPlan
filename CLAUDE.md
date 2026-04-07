# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GodsPlan is a full-stack Catholic church finder web app. Monorepo with two independent apps:
- **`/backend`** — Node.js/Express API with TypeORM + PostgreSQL/PostGIS
- **`/web`** — React 19 + Vite + Tailwind CSS frontend

## Commands

### Backend (`cd backend`)
- `npm run dev` — dev server with watch mode (port 3000)
- `npm run build` — TypeScript compilation to `dist/`
- `npm run start` — run compiled server
- `npm run scrape` — run church data scrapers
- `npm run typeorm` — database migrations CLI
- `npm run lint` — ESLint
- `npm run test` — Jest tests

### Frontend (`cd web`)
- `npm run dev` — Vite dev server (port 3022)
- `npm run build` — TypeScript check + Vite production build
- `npm run lint` — ESLint
- `npm run preview` — preview production build

## Architecture

### Backend
- **Entry point**: `src/index.ts` — Express server with Helmet, CORS, JSON parsing
- **API prefix**: `/api/v1` (configurable via `API_PREFIX` env)
- **Database**: PostgreSQL with PostGIS for geospatial queries. Config in `src/config/database.ts`. TypeORM with `synchronize: true` in dev (disable in prod).
- **Models**: `Church` (JSONB fields for address, massSchedules, contact, accessibility), `Liturgy` (daily readings), `ChurchEvent`
- **Routes**: `churches-simple.ts` (lightweight list + PostGIS nearby search), `churches.ts` (full details), `liturgy.ts` (daily readings from AELF), `admin-stats.ts`
- **Scrapers**: `BaseScraper` base class, implementations for Google Maps/Places, MessesInfo, Quebec churches, Liturgy (AELF API). Reliability scoring in `reliabilityScoring.ts`.
- **Background jobs**: `jobs/liturgySync.ts` — cron job syncing liturgy data daily at 3 AM

### Frontend
- **Entry**: `main.tsx` → `App.tsx` (React Router)
- **State**: Zustand stores in `store/` — `useChurchStore` (churches, filters, selection, geolocation), `useAuthStore`, `useNotificationStore`
- **API client**: `lib/api.ts` — fetch wrapper hitting `https://godsplan-api.montparnas.fr/api/v1`
- **Types**: `lib/types.ts` — `Church`, `ChurchListItem`, `Address`, `MassSchedule`, etc.
- **Pages**: `DashboardPage` (main map+list, responsive mobile panel with drag gestures), `LandingPage`, `LecturesPage` (liturgy), `AdminDashboard`, `LoginPage`, `RegisterPage`, `SavedPage`, `ProfilePage`
- **Map**: Leaflet with marker clustering (`Map.tsx`, `Map.clustered.tsx`), Mapbox GL alternative
- **UI components**: Radix UI primitives in `components/ui/`, layout components in `components/layout/`
- **Path alias**: `@/*` → `src/*`
- **i18n**: i18next with browser language detection

### Theming
- Dark mode via CSS class strategy
- CSS variable-based color system (primary, secondary, surface variants, on-surface, outline)
- Custom fonts: Manrope (headlines), Inter (body), Lora (serif)

## Key Patterns
- Church nearby search uses raw SQL with PostGIS `ST_DDistance` to bypass TypeORM geography limitations
- Mobile `DashboardPage` uses a swipeable bottom panel with peek/half/full states
- `ChurchListItem` is a lightweight projection; `Church` is the full entity with all JSONB fields
- Scrapers follow a base class pattern — extend `BaseScraper` for new data sources
