import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
  rateLimit?: number; // milliseconds between requests
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

  async scrape(): Promise<ScrapedChurch[]> {
    console.log(`🔍 Starting ${this.config.name} scraper...`);

    try {
      const churchUrls = await this.scrapeChurchList();
      console.log(`📋 Found ${churchUrls.length} churches to scrape`);

      const churches: ScrapedChurch[] = [];

      for (const url of churchUrls) {
        try {
          const church = await this.scrapeChurchDetails(url);
          if (church) {
            churches.push(church);
            console.log(`✅ Scraped: ${church.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to scrape ${url}:`, error);
        }
      }

      console.log(`✅ ${this.config.name} scraper completed: ${churches.length} churches`);
      return churches;
    } catch (error) {
      console.error(`❌ ${this.config.name} scraper failed:`, error);
      throw error;
    }
  }
}
