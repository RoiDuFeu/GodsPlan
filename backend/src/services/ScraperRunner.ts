import { AppDataSource } from '../config/database';
import { ScraperRun, ScraperError } from '../models/ScraperRun';
import { MessesInfoScraper } from '../scrapers/MessesInfoScraper';
import { GoogleMapsScraper } from '../scrapers/GoogleMapsScraper';
import { LiturgyScraper } from '../scrapers/LiturgyScraper';
import { ScraperCallbacks, ScraperLogEntry, ScrapedChurch } from '../scrapers/BaseScraper';
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
];

const MAX_LOG_BUFFER = 500;

class ScraperRunner {
  private running = new Map<string, string>(); // scraperName -> runId
  private cancelledRuns = new Set<string>(); // runIds that have been cancelled
  private logBuffers = new Map<string, ScraperLogEntry[]>(); // runId -> logs
  private logSubscribers = new Map<string, Set<LogSubscriber>>(); // runId -> subscribers
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

  async trigger(scraperName: string, departments: string[] = []): Promise<ScraperRun> {
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
    });
    await runRepo.save(run);

    this.running.set(scraperName, run.id);

    // Fire and forget — the scrape runs in the background
    this.execute(scraperName, run, departments).catch((err) => {
      console.error(`ScraperRunner: unhandled error for ${scraperName}:`, err);
    });

    return run;
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
      shouldCancel: () => {
        return this.cancelledRuns.has(run.id);
      },
    };

    try {
      switch (scraperName) {
        case 'messes.info': {
          const concurrency = Number(process.env.SCRAPE_CONCURRENCY) || 4;
          const scraper = new MessesInfoScraper(departments.length > 0 ? departments : ['75'], concurrency);
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
          break;
        }

        case 'google-maps': {
          // Google Maps enrichment doesn't use BaseScraper.scrape() directly
          // It enriches existing churches, so we track it differently
          const scraper = new GoogleMapsScraper({ useFixtures: false });
          if (!scraper.isEnabled()) {
            throw new Error('Google Maps scraper is not enabled (missing configuration)');
          }
          await scraper.close();
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
      setTimeout(() => {
        this.logBuffers.delete(run.id);
        this.logSubscribers.delete(run.id);
        this.runResults.delete(run.id);
      }, 10 * 60 * 1000);
    }
  }
}

export const scraperRunner = new ScraperRunner();
