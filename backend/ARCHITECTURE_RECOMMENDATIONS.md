# 🏗️ GodsPlan Architecture Recommendations

**Date:** 2026-03-17  
**Scope:** Long-term architecture improvements beyond current refactor  
**Horizon:** 3-6 months

---

## 🎯 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GodsPlan Backend                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Express    │      │   TypeORM    │                     │
│  │   Server     │─────▶│   (Postgres) │                     │
│  └──────────────┘      └──────────────┘                     │
│         │                      ▲                              │
│         │                      │                              │
│         ▼                      │                              │
│  ┌──────────────────────────────────────────┐               │
│  │           Scraper Pipeline                │               │
│  │                                            │               │
│  │  ┌─────────────────┐  ┌─────────────────┐│               │
│  │  │ MessesInfo      │  │ GoogleMaps      ││               │
│  │  │ Scraper         │  │ Scraper         ││               │
│  │  │ (Puppeteer)     │  │ (Puppeteer)     ││               │
│  │  └─────────────────┘  └─────────────────┘│               │
│  │                                            │               │
│  │  ┌─────────────────┐                      │               │
│  │  │ GooglePlaces    │                      │               │
│  │  │ Scraper         │                      │               │
│  │  │ (API)           │                      │               │
│  │  └─────────────────┘                      │               │
│  │            │                               │               │
│  │            ▼                               │               │
│  │  ┌─────────────────┐                      │               │
│  │  │ Reliability     │                      │               │
│  │  │ Scoring         │                      │               │
│  │  └─────────────────┘                      │               │
│  └──────────────────────────────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Recommended Future Improvements

### 1. **Queue-Based Scraping (Priority: HIGH)**

**Problem:** Current pipeline is monolithic and blocking

**Solution:** Message queue (BullMQ + Redis)

```typescript
// Proposed architecture
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   API       │─────▶│  Job Queue  │─────▶│  Workers    │
│  Endpoint   │      │  (BullMQ)   │      │  (N nodes)  │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   Redis     │
                     │  (state)    │
                     └─────────────┘

// Job types:
- scrape-messes-info
- enrich-google-maps
- enrich-google-places
- calculate-reliability
- detect-conflicts
```

**Benefits:**
- Horizontal scaling (add more workers)
- Job retries built-in
- Priority queues (urgent vs batch)
- Progress tracking
- Failure isolation

**Implementation:**
```typescript
// src/jobs/scrapeChurch.job.ts
import { Queue, Worker } from 'bullmq';

const scrapeQueue = new Queue('scrape', { connection: redisConfig });

// Producer
await scrapeQueue.add('scrape-church', {
  churchId: '123',
  scraper: 'messes-info'
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});

// Consumer
const worker = new Worker('scrape', async (job) => {
  const { churchId, scraper } = job.data;
  
  if (scraper === 'messes-info') {
    const result = await messesInfoScraper.scrapeChurchDetails(url);
    return result;
  }
  
  // ... handle other scrapers
}, { connection: redisConfig });
```

**Effort:** 2-3 days  
**Impact:** 10x scalability

---

### 2. **Caching Layer (Priority: HIGH)**

**Problem:** Repeated API calls waste quota + money

**Solution:** Multi-level caching

```typescript
┌─────────────────────────────────────────────────────────┐
│                   Caching Strategy                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  L1: In-memory (Node.js Map)                             │
│      - TTL: 5 minutes                                    │
│      - Use: Same-session deduplication                   │
│                                                           │
│  L2: Redis                                               │
│      - TTL: 24 hours (Google API responses)              │
│      - TTL: 7 days (geocoding results)                   │
│      - Use: Cross-worker sharing                         │
│                                                           │
│  L3: Database (dataSources.metadata)                     │
│      - Persistent storage                                │
│      - Use: Historical data, temporal decay              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// src/cache/cacheManager.ts
export class CacheManager {
  private l1Cache = new Map<string, { data: any, expires: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    // L1: Check memory
    const l1 = this.l1Cache.get(key);
    if (l1 && l1.expires > Date.now()) {
      return l1.data as T;
    }
    
    // L2: Check Redis
    const l2 = await redis.get(key);
    if (l2) {
      this.l1Cache.set(key, { data: JSON.parse(l2), expires: Date.now() + 300000 });
      return JSON.parse(l2) as T;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number): Promise<void> {
    // L1: Memory
    this.l1Cache.set(key, { data: value, expires: Date.now() + Math.min(ttl, 300000) });
    
    // L2: Redis
    await redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
  }
}

// Usage in GooglePlacesScraper
const cacheKey = `google-place:${query}`;
const cached = await cache.get<GooglePlaceDetailsResponse>(cacheKey);

if (cached) {
  return mapGoogleResult(cached.result, cached.result.place_id!);
}

const response = await this.axios.get('/details/json', { ... });
await cache.set(cacheKey, response.data, 24 * 60 * 60 * 1000); // 24h
```

**Benefits:**
- 90% reduction in API calls
- Faster response times
- Cost savings (Google API pricing)

**Effort:** 1-2 days  
**Impact:** High (cost + performance)

---

### 3. **Scraper Health Monitoring (Priority: MEDIUM)**

**Problem:** Silent failures, no visibility into scraper health

**Solution:** Prometheus + Grafana metrics

```typescript
// Metrics to track:
- scraper_requests_total (by scraper, status)
- scraper_duration_seconds (histogram)
- scraper_errors_total (by type)
- circuit_breaker_state (gauge)
- api_quota_remaining (gauge)
- memory_usage_bytes (gauge)
- active_puppeteer_browsers (gauge)

// Example instrumentation
import { Counter, Histogram } from 'prom-client';

const scrapeCounter = new Counter({
  name: 'scraper_requests_total',
  help: 'Total scraper requests',
  labelNames: ['scraper', 'status']
});

const scrapeDuration = new Histogram({
  name: 'scraper_duration_seconds',
  help: 'Scraper request duration',
  labelNames: ['scraper'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// In scraper code
async scrapeChurchDetails(url: string): Promise<ScrapedChurch | null> {
  const end = scrapeDuration.startTimer({ scraper: 'messes-info' });
  
  try {
    const result = await this.fetchAndParse(url);
    scrapeCounter.inc({ scraper: 'messes-info', status: 'success' });
    return result;
  } catch (error) {
    scrapeCounter.inc({ scraper: 'messes-info', status: 'error' });
    throw error;
  } finally {
    end();
  }
}
```

**Grafana Dashboard:**
- Success rate (last 24h)
- P95/P99 latency
- Error breakdown by type
- API quota burn rate
- Circuit breaker alerts

**Effort:** 1-2 days  
**Impact:** Proactive issue detection

---

### 4. **Incremental Scraping (Priority: MEDIUM)**

**Problem:** Full scrape takes too long, wastes resources

**Solution:** Smart incremental updates

```typescript
// Strategy:
1. Track lastScraped per church
2. Prioritize stale churches (temporal decay < 0.5)
3. Schedule batch updates (e.g., 20 churches per hour)
4. Re-scrape on user-triggered events

// Implementation
const staleChurches = await churchRepository
  .createQueryBuilder('church')
  .where('church.lastVerified < :threshold', {
    threshold: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days
  })
  .orderBy('church.lastVerified', 'ASC')
  .take(20)
  .getMany();

for (const church of staleChurches) {
  await scrapeQueue.add('refresh-church', { churchId: church.id });
}
```

**Scheduling:**
```bash
# Cron jobs (node-cron)
0 */2 * * * # Every 2 hours: scrape 20 stalest churches
0 0 * * 0   # Every Sunday: full database refresh (low traffic time)
0 8 * * *   # Every day 8am: scrape newly added churches
```

**Benefits:**
- Continuous freshness
- Lower infrastructure load
- Better user experience (always recent data)

**Effort:** 1 day  
**Impact:** High (user experience)

---

### 5. **Conflict Resolution Workflow (Priority: LOW)**

**Problem:** Divergent fields require manual review

**Solution:** Admin dashboard + resolution workflow

```typescript
// Conflict table schema
interface Conflict {
  id: string;
  churchId: string;
  field: string;
  messesValue: string;
  googleValue: string;
  recommended: 'messes' | 'google' | 'manual';
  status: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

// API endpoints
POST   /api/admin/conflicts/:id/resolve
GET    /api/admin/conflicts?status=pending
GET    /api/admin/conflicts/stats
```

**Admin UI (React):**
```tsx
<ConflictCard conflict={conflict}>
  <Field name={conflict.field} />
  
  <ValueComparison
    left={{ source: 'messes.info', value: conflict.messesValue }}
    right={{ source: 'Google', value: conflict.googleValue }}
  />
  
  <RecommendationBadge>{conflict.recommended}</RecommendationBadge>
  
  <ActionButtons>
    <Button onClick={() => resolve('messes')}>Use messes.info</Button>
    <Button onClick={() => resolve('google')}>Use Google</Button>
    <Button onClick={() => resolve('manual', customValue)}>Manual Entry</Button>
    <Button onClick={() => ignore()}>Ignore</Button>
  </ActionButtons>
</ConflictCard>
```

**Effort:** 3-4 days  
**Impact:** Medium (admin productivity)

---

### 6. **Webhooks for Real-Time Updates (Priority: LOW)**

**Problem:** Users can't trigger immediate updates

**Solution:** Webhook endpoints

```typescript
// User-facing API
POST /api/churches/:id/refresh
{
  "sources": ["messes-info", "google-maps"]
}

// Implementation
app.post('/api/churches/:id/refresh', async (req, res) => {
  const { id } = req.params;
  const { sources } = req.body;
  
  const jobs = sources.map(source => 
    scrapeQueue.add('scrape-church', {
      churchId: id,
      scraper: source,
      priority: 1 // High priority for user-triggered
    })
  );
  
  const jobIds = await Promise.all(jobs);
  
  res.json({
    message: 'Refresh queued',
    jobIds,
    estimatedTime: '~30 seconds'
  });
});

// Progress tracking
GET /api/jobs/:jobId/status
{
  "status": "processing",
  "progress": 65,
  "result": null
}
```

**Benefits:**
- User agency (request updates)
- Immediate feedback
- Premium feature potential

**Effort:** 2 days  
**Impact:** Low (nice-to-have)

---

## 🗺️ Long-Term Roadmap

### Q2 2026
- [ ] Implement queue-based scraping (BullMQ)
- [ ] Add Redis caching layer
- [ ] Set up Prometheus + Grafana monitoring

### Q3 2026
- [ ] Incremental scraping with smart scheduling
- [ ] Conflict resolution admin UI
- [ ] User-triggered refresh webhooks

### Q4 2026
- [ ] Machine learning for rite/language detection
- [ ] Automated geocoding fallback (multiple providers)
- [ ] Photo validation (duplicate detection)

---

## 🔧 Infrastructure Requirements

### Current (Minimum)
- Node.js 18+
- PostgreSQL 14+ (with PostGIS)
- 2 GB RAM
- 2 CPU cores

### Recommended (Scalable)
- Node.js 22+
- PostgreSQL 16+ (with PostGIS)
- Redis 7+ (for caching + queues)
- 4 GB RAM per worker
- 4 CPU cores per worker
- Docker + Kubernetes (for orchestration)

---

## 💰 Cost Optimization

### Google API Costs

**Current:**
- Google Places API: $0.017 per request
- 208 churches * 2 requests per church = 416 requests
- 416 * $0.017 = **$7.07 per full scrape**
- Daily scrapes = **$212/month**

**With Caching (24h TTL):**
- 90% cache hit rate
- 416 * 0.1 * $0.017 = **$0.71 per day**
- **$21/month** (90% savings)

**Recommendation:** Implement caching ASAP

---

## 🎓 Best Practices Checklist

### Code Quality
- [x] TypeScript strict mode
- [x] No `any` types
- [x] JSDoc on all exports
- [x] ESLint + Prettier configured
- [ ] 80%+ test coverage (in progress)

### Performance
- [x] Concurrency control (p-limit)
- [x] Rate limiting (token bucket)
- [x] Memory leak fixes
- [ ] Caching layer (recommended)
- [ ] Queue-based processing (recommended)

### Reliability
- [x] Retry logic (exponential backoff)
- [x] Circuit breaker
- [x] Graceful shutdown
- [ ] Monitoring (Prometheus)
- [ ] Alerting (PagerDuty/OpsGenie)

### Security
- [x] Environment variables for secrets
- [x] User-Agent headers
- [ ] Rate limiting on API endpoints
- [ ] Input validation (Zod schemas)
- [ ] HTTPS only in production

---

## 📞 Questions?

**Contact:** Artemis (via openclaw workspace)  
**Review Frequency:** Quarterly architecture review  
**Next Review:** June 2026

---

**End of Architecture Recommendations**  
**Prepared by:** Artemis 🌙  
**Version:** 1.0
