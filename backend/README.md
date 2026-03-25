# God's Plan Backend

Express + TypeScript API with automated scrapers for church data in Paris.

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── models/          # TypeORM entities (Church, etc.)
│   ├── routes/          # Express route handlers
│   ├── services/        # Business logic
│   ├── scrapers/        # Web scrapers for data collection
│   │   ├── BaseScraper.ts
│   │   ├── MessesInfoScraper.ts
│   │   └── index.ts     # Scraper orchestrator
│   ├── utils/           # Helper functions
│   └── index.ts         # Application entry point
├── db/
│   └── init/            # Database initialization scripts
└── logs/                # Application logs
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for PostgreSQL + PostGIS)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp ../.env.example ../.env

# Start PostgreSQL + PostGIS
docker-compose up -d

# Run development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### Database Setup

The database is automatically initialized with PostGIS extension on first run.

To manually run migrations:

```bash
npm run migration:run
```

## 📡 API Endpoints

### Health Check

```
GET /health
```

Returns server status and uptime.

### Churches

```
GET /api/v1/churches
```

List all churches with optional filters:
- `city` - Filter by city name
- `rite` - Filter by rite type
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

```
GET /api/v1/churches/nearby?lat=48.8566&lng=2.3522&radius=5
```

Find churches near a location:
- `lat` - Latitude (required)
- `lng` - Longitude (required)
- `radius` - Search radius in kilometers (default: 5)
- `limit` - Max results (default: 20)

```
GET /api/v1/churches/:id
```

Get detailed information for a specific church.

## 🕷️ Scrapers

### Running Scrapers Manually

```bash
# Google enrichment only
npm run scrape:google

# Google enrichment with local fixtures (no API key needed)
npm run scrape:google -- --fixtures --church "Notre-Dame,Sacré-Cœur"

# Full run (messes.info + Google)
npm run scrape -- --with-messes
```

Useful flags:
- `--google-only` (already used by `scrape:google`)
- `--with-messes` to scrape/refresh messes.info first
- `--fixtures` to use local Google fixtures (for dev/tests)
- `--church "Name1,Name2"` to target specific churches
- `--limit N` to restrict number of churches

This pipeline:
1. Loads churches from DB (or refreshes with messes.info if requested)
2. Enriches each church with Google data (name/address/GPS/hours/photos/reviews/rating)
3. Computes cross-source confidence score (Google vs messes.info)
4. Stores source metadata and scores in `churches.dataSources`
5. Updates `churches.reliabilityScore`
6. Generates `GOOGLE_ENRICHMENT_REPORT.md`

### Scraper Sources

- **Messes.info** - Primary source for mass schedules in France
- **Google Places API** - Enrichment source (address/GPS/hours/photos/reviews/rating)
- **Diocèse de Paris** (TODO) - Official diocese website

### Adding a New Scraper

1. Create a new scraper class extending `BaseScraper`
2. Implement `scrapeChurchList()` and `scrapeChurchDetails()`
3. Add it to `src/scrapers/index.ts`

Example:

```typescript
import { BaseScraper, ScrapedChurch } from './BaseScraper';

export class MyCustomScraper extends BaseScraper {
  constructor() {
    super({
      name: 'my-source',
      baseUrl: 'https://example.com',
      rateLimit: 2000,
    });
  }

  async scrapeChurchList(): Promise<string[]> {
    // Return array of church URLs
  }

  async scrapeChurchDetails(url: string): Promise<ScrapedChurch | null> {
    // Return scraped church data
  }
}
```

## 🔧 Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production build
- `npm run scrape` - Run scrapers manually
- `npm run lint` - Lint TypeScript code
- `npm test` - Run tests

### Environment Variables

See `../.env.example` for all available options.

Key variables:
- `POSTGRES_*` - Database connection
- `PORT` - API port (default: 3000)
- `SCRAPE_INTERVAL_HOURS` - Auto-scrape interval (default: 24)
- `GOOGLE_PLACES_API_KEY` - Required for live Google Places enrichment
- `GOOGLE_SCRAPER_USE_FIXTURES=true` - Force local fixtures mode (dev/tests)

## 📊 Database Schema

### Church Entity

```typescript
{
  id: string (UUID)
  name: string
  description?: string
  address: {
    street: string
    postalCode: string
    city: string
    district?: string
  }
  location: geography (PostGIS Point)
  latitude: number
  longitude: number
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
  massSchedules: Array<{
    dayOfWeek: number (0-6)
    time: string (HH:MM)
    rite: ChurchRite
    language?: string
    notes?: string
  }>
  rites: ChurchRite[]
  languages: string[]
  accessibility?: {
    wheelchairAccessible: boolean
    hearingLoop: boolean
    parking: boolean
    notes?: string
  }
  photos: string[]
  dataSources: Array<{
    name: string
    url?: string
    lastScraped: Date
    reliability: number (0-100)
  }>
  reliabilityScore: number (0-100)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastVerified?: Date
}
```

## 🎯 Roadmap

- [x] Base API with Express + TypeScript
- [x] PostgreSQL + PostGIS integration
- [x] Church entity with geospatial queries
- [x] Messes.info scraper
- [ ] Diocèse de Paris scraper
- [ ] Automated daily scraping (cron job)
- [ ] Caching layer (Redis)
- [ ] Admin API for manual church management
- [ ] Bulk import/export functionality
- [ ] API rate limiting
- [ ] Authentication & authorization
- [ ] Comprehensive tests

## 📝 Notes

- Rate limiting is built into scrapers (default: 1-2s between requests)
- Geocoding uses OpenStreetMap Nominatim (free, no API key required)
- Reliability scores are calculated based on data completeness and source quality
- Multiple sources for the same church are merged with averaged reliability scores

---

Built with 🌙 by charbonneurs de l'espace
