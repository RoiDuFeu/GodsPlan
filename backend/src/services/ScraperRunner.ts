import { AppDataSource } from '../config/database';
import { ScraperRun, ScraperError } from '../models/ScraperRun';
import { Church, DataSource } from '../models/Church';
import { MessesInfoScraper, SeedChurchData } from '../scrapers/MessesInfoScraper';
import { GoogleMapsScraper } from '../scrapers/GoogleMapsScraper';
import { LiturgyScraper } from '../scrapers/LiturgyScraper';
import { ChurchWebsiteScraper } from '../scrapers/ChurchWebsiteScraper';
import { ScraperCallbacks, ScraperLogEntry, ScrapedChurch, ScreencastFrame } from '../scrapers/BaseScraper';
import { saveChurches } from './ChurchSaver';

interface ScraperRegistryEntry {
  name: string;
  description: string;
  supportsDepartments: boolean;
}

export interface ChurchResult {
  name: string;
  url: string;
  status: 'success' | 'error';
  hasSchedules: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  hasCoordinates: boolean;
  errorMessage?: string;
}

type LogSubscriber = (entry: ScraperLogEntry) => void;
type FrameSubscriber = (data: ScreencastFrame) => void;

const SCRAPER_REGISTRY: ScraperRegistryEntry[] = [
  {
    name: 'messes.info',
    description: 'Scrape church listings and mass schedules from messes.info',
    supportsDepartments: true,
  },
  {
    name: 'google-maps',
    description: 'Enrich church data with Google Maps (photos, reviews, coordinates)',
    supportsDepartments: false,
  },
  {
    name: 'liturgy',
    description: 'Fetch daily liturgy readings from AELF/Catholic readings API',
    supportsDepartments: false,
  },
  {
    name: 'church-website',
    description: 'Scrape parish websites for mass schedules, confessions, and events',
    supportsDepartments: true,
  },
];

const MAX_LOG_BUFFER = 500;

class ScraperRunner {
  private running = new Map<string, string>(); // scraperName -> runId
  private cancelledRuns = new Set<string>(); // runIds that have been cancelled
  private logBuffers = new Map<string, ScraperLogEntry[]>(); // runId -> logs
  private logSubscribers = new Map<string, Set<LogSubscriber>>(); // runId -> subscribers
  private frameSubscribers = new Map<string, Set<FrameSubscriber>>(); // runId -> frame subscribers
  private runResults = new Map<string, ChurchResult[]>(); // runId -> church results

  getRegistry(): ScraperRegistryEntry[] {
    return SCRAPER_REGISTRY;
  }

  isRunning(scraperName: string): boolean {
    return this.running.has(scraperName);
  }

  getRunningId(scraperName: string): string | undefined {
    return this.running.get(scraperName);
  }

  getLogs(runId: string): ScraperLogEntry[] {
    return this.logBuffers.get(runId) || [];
  }

  getResults(runId: string): ChurchResult[] | undefined {
    return this.runResults.get(runId);
  }

  async cancel(scraperName: string): Promise<boolean> {
    const runId = this.running.get(scraperName);
    if (!runId) return false;

    this.cancelledRuns.add(runId);
    this.pushLog(runId, {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: 'Cancellation requested by user',
    });
    return true;
  }

  subscribe(runId: string, subscriber: LogSubscriber): () => void {
    if (!this.logSubscribers.has(runId)) {
      this.logSubscribers.set(runId, new Set());
    }
    this.logSubscribers.get(runId)!.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.logSubscribers.get(runId)?.delete(subscriber);
      if (this.logSubscribers.get(runId)?.size === 0) {
        this.logSubscribers.delete(runId);
      }
    };
  }

  subscribeFrames(runId: string, subscriber: FrameSubscriber): () => void {
    if (!this.frameSubscribers.has(runId)) {
      this.frameSubscribers.set(runId, new Set());
    }
    this.frameSubscribers.get(runId)!.add(subscriber);

    return () => {
      this.frameSubscribers.get(runId)?.delete(subscriber);
      if (this.frameSubscribers.get(runId)?.size === 0) {
        this.frameSubscribers.delete(runId);
      }
    };
  }

  private pushFrame(runId: string, data: ScreencastFrame) {
    this.frameSubscribers.get(runId)?.forEach((sub) => {
      try { sub(data); } catch { /* ignore */ }
    });
  }

  private pushLog(runId: string, entry: ScraperLogEntry) {
    if (!this.logBuffers.has(runId)) {
      this.logBuffers.set(runId, []);
    }
    const buffer = this.logBuffers.get(runId)!;
    buffer.push(entry);
    if (buffer.length > MAX_LOG_BUFFER) {
      buffer.shift();
    }

    // Notify subscribers
    this.logSubscribers.get(runId)?.forEach((sub) => {
      try { sub(entry); } catch { /* ignore */ }
    });
  }

  async trigger(
    scraperName: string,
    departments: string[] = [],
    options?: { forceFullDiscovery?: boolean; concurrency?: number; onlyMissingData?: boolean },
  ): Promise<ScraperRun> {
    if (this.running.has(scraperName)) {
      throw new Error(`Scraper "${scraperName}" is already running`);
    }

    const entry = SCRAPER_REGISTRY.find((s) => s.name === scraperName);
    if (!entry) {
      throw new Error(`Unknown scraper: "${scraperName}"`);
    }

    const runRepo = AppDataSource.getRepository(ScraperRun);
    const run = runRepo.create({
      scraperName,
      status: 'running',
      departments,
      errors: [],
      metadata: { forceFullDiscovery: options?.forceFullDiscovery || false, concurrency: options?.concurrency, onlyMissingData: options?.onlyMissingData || false },
    });
    await runRepo.save(run);

    this.running.set(scraperName, run.id);

    // Fire and forget — the scrape runs in the background
    this.execute(scraperName, run, departments).catch((err) => {
      console.error(`ScraperRunner: unhandled error for ${scraperName}:`, err);
    });

    return run;
  }

  /**
   * Scrape a single church from messes.info by URL.
   * Does not require the full scraper pipeline — just scrapes one page and saves.
   */
  async scrapeSingleChurch(
    churchUrl: string,
    seed?: SeedChurchData,
    onFrame?: (data: ScreencastFrame) => void,
  ): Promise<{ church: import('../scrapers/BaseScraper').ScrapedChurch | null; saved: boolean }> {
    const scraper = new MessesInfoScraper([], 1);
    const result = await scraper.scrapeSingleChurch(churchUrl, seed, onFrame);

    if (!result) {
      return { church: null, saved: false };
    }

    const saveResult = await saveChurches([result], 'messes.info');
    return { church: result, saved: saveResult.saved > 0 };
  }

  /**
   * Scrape a single church's website for schedules, confessions, events, etc.
   * Requires the church to already exist in the database with a website URL.
   */
  async scrapeChurchWebsite(churchId: string, onFrame?: (data: ScreencastFrame) => void): Promise<{
    massSchedules: number;
    officeSchedules: number;
    events: number;
    confidence: number;
  } | null> {
    const churchRepo = AppDataSource.getRepository(Church);
    const church = await churchRepo.findOne({ where: { id: churchId } });

    if (!church) {
      throw new Error(`Church not found: ${churchId}`);
    }

    if (!church.contact?.website) {
      throw new Error(`Church "${church.name}" has no website URL`);
    }

    const websiteScraper = new ChurchWebsiteScraper({ concurrency: 1 });

    if (onFrame) {
      websiteScraper.enableScreencast(onFrame);
    }

    try {
      const result = await websiteScraper.enrichChurch(church);

      if (!result) {
        return null;
      }

      // Merge mass schedules: keep existing, add new ones
      const existingKeys = new Set(
        (church.massSchedules || []).map((s) => `${s.dayOfWeek}:${s.time}`),
      );
      const newSchedules = result.massSchedules.filter(
        (s) => !existingKeys.has(`${s.dayOfWeek}:${s.time}`),
      );
      if (newSchedules.length > 0) {
        church.massSchedules = [
          ...(church.massSchedules || []),
          ...newSchedules.map((s) => ({
            ...s,
            notes: s.notes ? `${s.notes} (source: church-website)` : 'source: church-website',
          })),
        ];
      }

      if (result.officeSchedules.length > 0) {
        church.officeSchedules = result.officeSchedules;
      }

      if (result.events.length > 0) {
        church.upcomingEvents = result.events;
      }

      // Update data source
      if (!church.dataSources) church.dataSources = [];
      const sourceIdx = church.dataSources.findIndex((ds) => ds.name === 'church-website');
      const sourceEntry: DataSource = {
        name: 'church-website',
        url: church.contact?.website,
        lastScraped: new Date(),
        reliability: result.confidence,
        metadata: {
          massSchedulesFound: result.massSchedules.length,
          officeSchedulesFound: result.officeSchedules.length,
          eventsFound: result.events.length,
          subPagesVisited: result.subPagesVisited,
        },
      };
      if (sourceIdx >= 0) {
        church.dataSources[sourceIdx] = sourceEntry;
      } else {
        church.dataSources.push(sourceEntry);
      }

      church.lastVerified = new Date();
      await churchRepo.save(church);

      return {
        massSchedules: result.massSchedules.length,
        officeSchedules: result.officeSchedules.length,
        events: result.events.length,
        confidence: result.confidence,
      };
    } finally {
      await websiteScraper.close();
    }
  }

  private async execute(scraperName: string, run: ScraperRun, departments: string[]): Promise<void> {
    const runRepo = AppDataSource.getRepository(ScraperRun);
    const startTime = Date.now();
    const errors: ScraperError[] = [];
    const churchResults: ChurchResult[] = [];
    let churchesFound = 0;

    this.logBuffers.set(run.id, []);

    const callbacks: ScraperCallbacks = {
      onChurchScraped: (church: ScrapedChurch) => {
        churchesFound++;
        churchResults.push({
          name: church.name,
          url: church.sourceUrl,
          status: 'success',
          hasSchedules: (church.massSchedules?.length ?? 0) > 0,
          hasPhone: !!church.contact?.phone,
          hasEmail: !!church.contact?.email,
          hasWebsite: !!church.contact?.website,
          hasCoordinates: church.latitude != null && church.longitude != null,
        });
      },
      onChurchError: (url: string, error: Error) => {
        errors.push({
          url,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
        churchResults.push({
          name: url,
          url,
          status: 'error',
          hasSchedules: false,
          hasPhone: false,
          hasEmail: false,
          hasWebsite: false,
          hasCoordinates: false,
          errorMessage: error.message,
        });
      },
      onProgress: (current: number, total: number) => {
        // Update run record periodically (every 10 churches)
        if (current % 10 === 0) {
          run.churchesFound = churchesFound;
          run.errorCount = errors.length;
          runRepo.save(run).catch(() => {});
        }
      },
      onLog: (entry: ScraperLogEntry) => {
        this.pushLog(run.id, entry);
      },
      onFrame: (data: ScreencastFrame) => {
        this.pushFrame(run.id, data);
      },
      shouldCancel: () => {
        return this.cancelledRuns.has(run.id);
      },
    };

    try {
      switch (scraperName) {
        case 'messes.info': {
          const concurrency = (run.metadata as Record<string, unknown>)?.concurrency as number || Number(process.env.SCRAPE_CONCURRENCY) || 4;
          const deptCodes = departments.length > 0 ? departments : ['75'];
          const scraper = new MessesInfoScraper(deptCodes, concurrency);
          const forceDiscovery = !!(run.metadata as Record<string, unknown>)?.forceFullDiscovery;

          // Load cached messes.info URLs from DB to skip expensive list discovery
          if (!forceDiscovery) {
            const churchRepo = AppDataSource.getRepository(Church);
            try {
              const cachedChurches = await churchRepo
                .createQueryBuilder('church')
                .where('church.isActive = true')
                .andWhere(
                  "SUBSTRING(church.address->>'postalCode', 1, 2) IN (:...depts)",
                  { depts: deptCodes },
                )
                .getMany();

              const cachedEntries: Array<{ url: string; seed: SeedChurchData }> = [];
              for (const c of cachedChurches) {
                const messesSource = (c.dataSources || []).find(
                  (ds) => ds.name === 'messes.info' && ds.url,
                );
                if (!messesSource?.url) continue;
                // Skip sources already marked as stale
                if ((messesSource.metadata as Record<string, unknown>)?.stale) continue;

                cachedEntries.push({
                  url: messesSource.url,
                  seed: {
                    name: c.name,
                    address: c.address,
                    latitude: c.latitude,
                    longitude: c.longitude,
                  },
                });
              }

              if (cachedEntries.length > 0) {
                scraper.loadCachedUrls(cachedEntries);
                scraper.skipDiscovery = true;

                this.pushLog(run.id, {
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: `Loaded ${cachedEntries.length} cached messes.info URLs from database, skipping list discovery`,
                });
              }
            } catch (cacheError) {
              // If cache loading fails, fall through to full discovery
              this.pushLog(run.id, {
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: `Failed to load cached URLs, falling back to full discovery: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`,
              });
            }
          } else {
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Force full discovery requested, skipping cache',
            });
          }

          const churches = await scraper.scrape(callbacks);
          churchesFound = churches.length;

          // Save scraped churches to database
          if (churches.length > 0) {
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Saving ${churches.length} churches to database...`,
            });

            const saveResult = await saveChurches(churches, 'messes.info', (current, total, name) => {
              if (current % 10 === 0 || current === total) {
                this.pushLog(run.id, {
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: `Saving ${current}/${total}: ${name}`,
                  progress: { current, total },
                });
              }
            });

            run.churchesSaved = saveResult.saved;

            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'success',
              message: `Database save complete: ${saveResult.saved} saved, ${saveResult.skipped} skipped (no coords), ${saveResult.errors} errors`,
            });
          }

          // Handle stale URLs — mark them in DB so next run re-discovers
          const staleUrls = scraper.getStaleUrls();
          if (staleUrls.length > 0) {
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: `${staleUrls.length} cached URLs returned no data (marked as stale). Run with forceFullDiscovery to re-discover.`,
            });

            const churchRepo = AppDataSource.getRepository(Church);
            for (const staleUrl of staleUrls) {
              try {
                const church = await churchRepo
                  .createQueryBuilder('church')
                  .where(
                    `EXISTS (SELECT 1 FROM jsonb_array_elements(church."dataSources") ds WHERE ds->>'url' = :url)`,
                    { url: staleUrl },
                  )
                  .getOne();

                if (church) {
                  const source = (church.dataSources || []).find((ds) => ds.url === staleUrl);
                  if (source) {
                    source.metadata = {
                      ...((source.metadata as Record<string, unknown>) || {}),
                      stale: true,
                      staleDetectedAt: new Date().toISOString(),
                    };
                    await churchRepo.save(church);
                  }
                }
              } catch {
                // Best-effort stale marking, don't fail the run
              }
            }
          }
          break;
        }

        case 'google-maps': {
          const churchRepo = AppDataSource.getRepository(Church);
          const onlyMissingData = !!(run.metadata as Record<string, unknown>)?.onlyMissingData;

          // Get active churches, prioritize those never enriched by Google Maps
          const qb = churchRepo
            .createQueryBuilder('church')
            .where('church.isActive = true')
            .orderBy('church.updatedAt', 'ASC');

          // Filter by departments if provided
          if (departments.length > 0) {
            qb.andWhere(
              "SUBSTRING(church.address->>'postalCode', 1, 2) IN (:...depts)",
              { depts: departments },
            );
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Filtering by departments: ${departments.join(', ')}`,
            });
          }

          // Only churches missing Google Maps data
          if (onlyMissingData) {
            qb.andWhere(
              `NOT EXISTS (SELECT 1 FROM jsonb_array_elements(church."dataSources") ds WHERE ds->>'name' = 'google-maps')`,
            );
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Enrichment mode: only churches without Google Maps data',
            });
          }

          const maxChurches = Number(process.env.GOOGLE_MAPS_MAX_CHURCHES) || 0;
          if (maxChurches > 0) {
            qb.limit(maxChurches);
          }

          const churches = await qb.getMany();
          churchesFound = churches.length;

          this.pushLog(run.id, {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Found ${churches.length} churches to enrich with Google Maps`,
          });

          const scraper = new GoogleMapsScraper({ useFixtures: false });
          if (!scraper.isEnabled()) {
            throw new Error('Google Maps scraper is not enabled (missing configuration)');
          }

          let completedCount = 0;

          try {
            for (const church of churches) {
              if (callbacks.shouldCancel?.()) break;

              this.pushLog(run.id, {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Enriching ${church.name} (${completedCount + 1}/${churches.length})`,
              });

              try {
                const result = await scraper.enrichChurch(church);

                if (result) {
                  // Merge photos (add new, keep existing, cap at 2)
                  const existingPhotos = new Set(church.photos || []);
                  const newPhotos = (result.photos || []).filter((p) => !existingPhotos.has(p));
                  if (newPhotos.length > 0) {
                    church.photos = [...(church.photos || []), ...newPhotos].slice(0, 2);
                  }

                  // Update contact info (fill gaps, don't overwrite)
                  if (!church.contact) church.contact = {};
                  if (!church.contact.phone && result.contact?.phone) {
                    church.contact.phone = result.contact.phone;
                  }
                  if (!church.contact.website && result.contact?.website) {
                    church.contact.website = result.contact.website;
                  }

                  // Update coordinates if missing
                  if ((!church.latitude || !church.longitude) && result.latitude && result.longitude) {
                    church.latitude = result.latitude;
                    church.longitude = result.longitude;
                    church.location = {
                      type: 'Point',
                      coordinates: [result.longitude, result.latitude],
                    };
                  }

                  // Update data source
                  if (!church.dataSources) church.dataSources = [];
                  const sourceIdx = church.dataSources.findIndex((ds) => ds.name === 'google-maps');
                  const sourceEntry: DataSource = {
                    name: 'google-maps',
                    url: result.googleMapsUrl,
                    lastScraped: new Date(),
                    reliability: result.rating ? Math.round(result.rating * 20) : 50,
                    metadata: {
                      placeId: result.placeId,
                      rating: result.rating,
                      userRatingsTotal: result.userRatingsTotal,
                      photosFound: (result.photos || []).length,
                      openingHours: result.openingHours,
                    },
                  };
                  if (sourceIdx >= 0) {
                    church.dataSources[sourceIdx] = sourceEntry;
                  } else {
                    church.dataSources.push(sourceEntry);
                  }

                  church.lastVerified = new Date();
                  await churchRepo.save(church);

                  completedCount++;
                  callbacks.onProgress?.(completedCount, churches.length);

                  callbacks.onChurchScraped?.({
                    name: church.name,
                    address: church.address,
                    sourceUrl: result.googleMapsUrl || '',
                    massSchedules: [],
                    contact: church.contact,
                  } as ScrapedChurch);

                  this.pushLog(run.id, {
                    timestamp: new Date().toISOString(),
                    level: 'success',
                    message: `${church.name}: ${(result.photos || []).length} photos, rating ${result.rating || 'N/A'}, ${result.userRatingsTotal || 0} reviews`,
                  });
                } else {
                  completedCount++;
                  callbacks.onProgress?.(completedCount, churches.length);

                  this.pushLog(run.id, {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `${church.name}: no Google Maps data found`,
                  });
                }
              } catch (churchError) {
                completedCount++;
                callbacks.onProgress?.(completedCount, churches.length);

                const errMsg = churchError instanceof Error ? churchError.message : String(churchError);
                callbacks.onChurchError?.(church.name, new Error(errMsg));

                this.pushLog(run.id, {
                  timestamp: new Date().toISOString(),
                  level: 'error',
                  message: `${church.name}: ${errMsg}`,
                });
              }
            }
          } finally {
            await scraper.close();
          }
          break;
        }

        case 'liturgy': {
          const scraper = new LiturgyScraper();
          const today = new Date().toISOString().split('T')[0];
          const liturgy = await scraper.fetchDailyLiturgy(today);
          if (liturgy) {
            churchesFound = 1; // 1 liturgy entry
          }
          break;
        }

        case 'church-website': {
          const churchRepo = AppDataSource.getRepository(Church);
          const onlyMissingData = !!(run.metadata as Record<string, unknown>)?.onlyMissingData;

          // Get churches with websites, oldest-updated first
          const qb = churchRepo
            .createQueryBuilder('church')
            .where('church.isActive = true')
            .andWhere("church.contact->>'website' IS NOT NULL")
            .andWhere("church.contact->>'website' != ''")
            .orderBy('church.updatedAt', 'ASC');

          // Filter by departments if provided
          if (departments.length > 0) {
            qb.andWhere(
              "SUBSTRING(church.address->>'postalCode', 1, 2) IN (:...depts)",
              { depts: departments },
            );
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Filtering by departments: ${departments.join(', ')}`,
            });
          }

          // Only churches missing schedule data
          if (onlyMissingData) {
            qb.andWhere(
              "(church.\"massSchedules\" IS NULL OR jsonb_array_length(church.\"massSchedules\") = 0)",
            );
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: 'Enrichment mode: only churches without mass schedules',
            });
          }

          const maxChurches = Number(process.env.CHURCH_WEBSITE_MAX_CHURCHES) || 0;
          if (maxChurches > 0) {
            qb.limit(maxChurches);
          }

          const allChurches = await qb.getMany();

          // Known-bad domains that are never actual parish websites
          const BAD_DOMAINS = [
            'eglise.catholique.fr', 'facebook.com', 'twitter.com', 'instagram.com',
            'youtube.com', 'linkedin.com', 'tiktok.com', 'pinterest.com',
            'play.google.com', 'apps.apple.com', 'apple.com',
          ];

          const isBadUrl = (url: string): boolean => {
            try {
              const hostname = new URL(url).hostname.toLowerCase();
              return BAD_DOMAINS.some((d) => hostname.includes(d));
            } catch {
              return true; // malformed URL
            }
          };

          // Phase 1: Clean up bad URLs + deduplicate
          const badUrlChurches: Church[] = [];
          const validUrlChurches: Church[] = [];
          for (const c of allChurches) {
            const url = c.contact?.website || '';
            if (isBadUrl(url)) {
              badUrlChurches.push(c);
            } else {
              validUrlChurches.push(c);
            }
          }

          // Deduplicate: skip URLs shared by 3+ churches (generic portal links)
          const urlCounts = new Map<string, number>();
          for (const c of validUrlChurches) {
            const url = c.contact?.website || '';
            urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
          }
          const churches = validUrlChurches.filter((c) => {
            const url = c.contact?.website || '';
            return (urlCounts.get(url) || 0) < 3;
          });
          const skippedDuplicates = validUrlChurches.length - churches.length;
          churchesFound = churches.length;

          // Clean up bad URLs from DB (remove the garbage website field)
          if (badUrlChurches.length > 0) {
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: `Cleaning ${badUrlChurches.length} churches with invalid website URLs (generic portals/social media)`,
            });
            for (const c of badUrlChurches) {
              if (c.contact) {
                delete c.contact.website;
                await churchRepo.save(c);
              }
            }
          }

          this.pushLog(run.id, {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Found ${allChurches.length} churches with websites: ${badUrlChurches.length} bad URLs cleaned, ${skippedDuplicates} duplicates skipped, ${churches.length} to scrape`,
          });

          // Emit all valid churches as pending cards
          for (const c of churches) {
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Queued: ${c.name}`,
              churchUpdate: {
                churchId: c.id,
                churchName: c.name,
                websiteUrl: c.contact?.website || '',
                status: 'pending',
              },
            });
          }

          const CONCURRENCY = (run.metadata as Record<string, unknown>)?.concurrency as number || Number(process.env.CHURCH_WEBSITE_CONCURRENCY) || 4;
          const websiteScraper = new ChurchWebsiteScraper({ concurrency: CONCURRENCY });
          websiteScraper.enableScreencast((data) => this.pushFrame(run.id, data));
          let completedCount = 0;

          const processChurch = async (church: Church) => {
            if (callbacks.shouldCancel?.()) return;

            // Emit scraping status
            this.pushLog(run.id, {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: `Scraping ${church.name}: ${church.contact?.website}`,
              churchUpdate: {
                churchId: church.id,
                churchName: church.name,
                websiteUrl: church.contact?.website || '',
                status: 'scraping',
              },
            });

            try {
              const result = await websiteScraper.enrichChurch(church, callbacks);

              if (result) {
                // Merge mass schedules: keep existing, add new ones
                const existingKeys = new Set(
                  (church.massSchedules || []).map((s) => `${s.dayOfWeek}:${s.time}`),
                );
                const newSchedules = result.massSchedules.filter(
                  (s) => !existingKeys.has(`${s.dayOfWeek}:${s.time}`),
                );
                if (newSchedules.length > 0) {
                  church.massSchedules = [
                    ...(church.massSchedules || []),
                    ...newSchedules.map((s) => ({
                      ...s,
                      notes: s.notes ? `${s.notes} (source: church-website)` : 'source: church-website',
                    })),
                  ];
                }

                if (result.officeSchedules.length > 0) {
                  church.officeSchedules = result.officeSchedules;
                }

                if (result.events.length > 0) {
                  church.upcomingEvents = result.events;
                }

                // Update data source
                if (!church.dataSources) church.dataSources = [];
                const sourceIdx = church.dataSources.findIndex((ds) => ds.name === 'church-website');
                const sourceEntry: DataSource = {
                  name: 'church-website',
                  url: church.contact?.website,
                  lastScraped: new Date(),
                  reliability: result.confidence,
                  metadata: {
                    massSchedulesFound: result.massSchedules.length,
                    officeSchedulesFound: result.officeSchedules.length,
                    eventsFound: result.events.length,
                    subPagesVisited: result.subPagesVisited,
                  },
                };
                if (sourceIdx >= 0) {
                  church.dataSources[sourceIdx] = sourceEntry;
                } else {
                  church.dataSources.push(sourceEntry);
                }

                church.lastVerified = new Date();
                await churchRepo.save(church);

                completedCount++;
                callbacks.onProgress?.(completedCount, churches.length);

                callbacks.onChurchScraped?.({
                  name: church.name,
                  address: church.address,
                  sourceUrl: church.contact?.website || '',
                  massSchedules: result.massSchedules.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    time: s.time,
                    rite: s.rite?.toString() || 'Paul VI',
                  })),
                  contact: church.contact,
                } as ScrapedChurch);

                // Emit success card update
                this.pushLog(run.id, {
                  timestamp: new Date().toISOString(),
                  level: 'success',
                  message: `${church.name}: ${result.massSchedules.length} masses, ${result.officeSchedules.length} offices, ${result.events.length} events (confidence: ${result.confidence}%)`,
                  churchUpdate: {
                    churchId: church.id,
                    churchName: church.name,
                    websiteUrl: church.contact?.website || '',
                    status: 'success',
                    massSchedules: result.massSchedules.length,
                    officeSchedules: result.officeSchedules.length,
                    events: result.events.length,
                    confidence: result.confidence,
                  },
                });
              } else {
                completedCount++;
                callbacks.onProgress?.(completedCount, churches.length);

                this.pushLog(run.id, {
                  timestamp: new Date().toISOString(),
                  level: 'info',
                  message: `${church.name}: no schedule data found`,
                  churchUpdate: {
                    churchId: church.id,
                    churchName: church.name,
                    websiteUrl: church.contact?.website || '',
                    status: 'no_data',
                  },
                });
              }
            } catch (churchError) {
              completedCount++;
              callbacks.onProgress?.(completedCount, churches.length);

              const errMsg = churchError instanceof Error ? churchError.message : String(churchError);
              callbacks.onChurchError?.(church.contact?.website || church.name, new Error(errMsg));

              this.pushLog(run.id, {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `${church.name}: ${errMsg}`,
                churchUpdate: {
                  churchId: church.id,
                  churchName: church.name,
                  websiteUrl: church.contact?.website || '',
                  status: 'error',
                  errorMessage: errMsg,
                },
              });
            }
          };

          // Parallel worker pool
          try {
            const queue = [...churches];
            const workers = Array.from({ length: CONCURRENCY }, async () => {
              while (queue.length > 0) {
                if (callbacks.shouldCancel?.()) break;
                const church = queue.shift();
                if (church) await processChurch(church);
              }
            });
            await Promise.all(workers);
          } finally {
            await websiteScraper.close();
          }
          break;
        }

        default:
          throw new Error(`No execution logic for scraper: ${scraperName}`);
      }

      if (this.cancelledRuns.has(run.id)) {
        run.status = 'cancelled';
      } else {
        run.status = 'success';
      }
    } catch (error) {
      if (this.cancelledRuns.has(run.id)) {
        run.status = 'cancelled';
      } else {
        run.status = 'failed';
      }
      const err = error instanceof Error ? error : new Error(String(error));
      errors.push({
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      run.churchesFound = churchesFound;
      run.errorCount = errors.length;
      run.errors = errors;
      run.completedAt = new Date();
      run.durationMs = Date.now() - startTime;

      // Store results summary in metadata
      const successCount = churchResults.filter(r => r.status === 'success').length;
      const missingSchedules = churchResults.filter(r => r.status === 'success' && !r.hasSchedules).length;
      const missingPhone = churchResults.filter(r => r.status === 'success' && !r.hasPhone).length;
      const missingCoords = churchResults.filter(r => r.status === 'success' && !r.hasCoordinates).length;

      run.metadata = {
        resultsSummary: {
          total: churchResults.length,
          success: successCount,
          errors: churchResults.filter(r => r.status === 'error').length,
          missingSchedules,
          missingPhone,
          missingCoords,
        },
      };

      await runRepo.save(run);
      this.running.delete(scraperName);
      this.cancelledRuns.delete(run.id);

      // Store results in memory (available for 10 minutes)
      this.runResults.set(run.id, churchResults);

      // Clean up after 10 minutes
      this.frameSubscribers.delete(run.id);
      setTimeout(() => {
        this.logBuffers.delete(run.id);
        this.logSubscribers.delete(run.id);
        this.runResults.delete(run.id);
      }, 10 * 60 * 1000);
    }
  }
}

export const scraperRunner = new ScraperRunner();
