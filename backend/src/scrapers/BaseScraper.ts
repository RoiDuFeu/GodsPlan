import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
  rateLimit?: number; // milliseconds between requests
  concurrency?: number; // number of parallel detail scrapers (default 1)
}

export interface ScrapedReview {
  authorName?: string;
  rating?: number;
  text?: string;
  relativeTimeDescription?: string;
  time?: number;
}

export interface ScrapedChurch {
  name: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    district?: string;
  };
  latitude?: number;
  longitude?: number;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  massSchedules?: Array<{
    dayOfWeek: number;
    time: string;
    rite: string;
    language?: string;
    notes?: string;
  }>;
  rites?: string[];
  languages?: string[];
  description?: string;
  photos?: string[];
  openingHours?: string[];
  rating?: number;
  userRatingsTotal?: number;
  reviews?: ScrapedReview[];
  sourceUrl: string;
}

export interface ScraperLogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  url?: string;
  churchName?: string;
  phase?: 'list' | 'detail';
  progress?: { current: number; total: number };
}

export interface ScraperCallbacks {
  onChurchScraped?: (church: ScrapedChurch) => void;
  onChurchError?: (url: string, error: Error) => void;
  onProgress?: (current: number, total: number) => void;
  onLog?: (entry: ScraperLogEntry) => void;
  shouldCancel?: () => boolean;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected axios: AxiosInstance;
  protected lastRequestTime = 0;

  constructor(config: ScraperConfig) {
    this.config = {
      timeout: 30000,
      rateLimit: 1000,
      userAgent:
        process.env.SCRAPE_USER_AGENT ||
        'Mozilla/5.0 (compatible; GodsPlan/1.0)',
      ...config,
    };

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
      },
    });
  }

  protected async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.rateLimit!) {
      const waitTime = this.config.rateLimit! - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  protected async fetchPage(url: string): Promise<cheerio.CheerioAPI> {
    await this.rateLimit();

    try {
      const response = await this.axios.get(url);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  abstract scrapeChurchList(): Promise<string[]>;
  abstract scrapeChurchDetails(url: string): Promise<ScrapedChurch | null>;

  protected emitLog(callbacks: ScraperCallbacks | undefined, entry: Omit<ScraperLogEntry, 'timestamp'>) {
    const full: ScraperLogEntry = { ...entry, timestamp: new Date().toISOString() };
    callbacks?.onLog?.(full);
  }

  async scrape(callbacks?: ScraperCallbacks): Promise<ScrapedChurch[]> {
    console.log(`🔍 Starting ${this.config.name} scraper...`);
    this.emitLog(callbacks, { level: 'info', message: `Starting ${this.config.name} scraper`, phase: 'list' });

    try {
      const churchUrls = await this.scrapeChurchList();
      const concurrency = this.config.concurrency || 1;
      console.log(`📋 Found ${churchUrls.length} churches to scrape (concurrency: ${concurrency})`);
      this.emitLog(callbacks, {
        level: 'info',
        message: `Found ${churchUrls.length} churches to scrape (${concurrency} workers)`,
        phase: 'detail',
      });

      const churches: ScrapedChurch[] = [];
      let completed = 0;
      let cancelled = false;

      if (concurrency <= 1) {
        // Sequential mode (original behavior)
        for (let i = 0; i < churchUrls.length; i++) {
          if (callbacks?.shouldCancel?.()) {
            this.emitLog(callbacks, { level: 'warn', message: 'Scraping cancelled by user' });
            break;
          }

          const url = churchUrls[i];
          completed++;
          callbacks?.onProgress?.(completed, churchUrls.length);
          this.emitLog(callbacks, {
            level: 'info',
            message: `Scraping church ${completed}/${churchUrls.length}`,
            url,
            phase: 'detail',
            progress: { current: completed, total: churchUrls.length },
          });

          try {
            const church = await this.scrapeChurchDetails(url);
            if (church) {
              churches.push(church);
              callbacks?.onChurchScraped?.(church);
              this.emitLog(callbacks, {
                level: 'success',
                message: `Scraped: ${church.name}`,
                url,
                churchName: church.name,
                phase: 'detail',
                progress: { current: completed, total: churchUrls.length },
              });
            }
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            callbacks?.onChurchError?.(url, err);
            this.emitLog(callbacks, {
              level: 'error',
              message: `Failed: ${err.message}`,
              url,
              phase: 'detail',
              progress: { current: completed, total: churchUrls.length },
            });
          }
        }
      } else {
        // Parallel mode with worker pool
        let nextIndex = 0;

        const worker = async (): Promise<void> => {
          while (!cancelled) {
            const idx = nextIndex++;
            if (idx >= churchUrls.length) break;

            if (callbacks?.shouldCancel?.()) {
              cancelled = true;
              this.emitLog(callbacks, { level: 'warn', message: 'Scraping cancelled by user' });
              break;
            }

            const url = churchUrls[idx];
            const current = ++completed;

            callbacks?.onProgress?.(current, churchUrls.length);
            this.emitLog(callbacks, {
              level: 'info',
              message: `Scraping church ${current}/${churchUrls.length}`,
              url,
              phase: 'detail',
              progress: { current, total: churchUrls.length },
            });

            try {
              const church = await this.scrapeChurchDetails(url);
              if (church) {
                churches.push(church);
                callbacks?.onChurchScraped?.(church);
                this.emitLog(callbacks, {
                  level: 'success',
                  message: `Scraped: ${church.name}`,
                  url,
                  churchName: church.name,
                  phase: 'detail',
                  progress: { current, total: churchUrls.length },
                });
              }
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              callbacks?.onChurchError?.(url, err);
              this.emitLog(callbacks, {
                level: 'error',
                message: `Failed: ${err.message}`,
                url,
                phase: 'detail',
                progress: { current, total: churchUrls.length },
              });
            }
          }
        };

        const workers = Array.from({ length: concurrency }, () => worker());
        await Promise.all(workers);
      }

      this.emitLog(callbacks, { level: 'success', message: `Completed: ${churches.length} churches scraped` });
      console.log(`✅ ${this.config.name} scraper completed: ${churches.length} churches`);
      return churches;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emitLog(callbacks, { level: 'error', message: `Scraper failed: ${err.message}` });
      console.error(`❌ ${this.config.name} scraper failed:`, error);
      throw error;
    }
  }
}
