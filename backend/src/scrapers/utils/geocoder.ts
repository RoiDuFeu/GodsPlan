/**
 * Geocoding service with caching and rate limiting for Nominatim
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { withRetry } from './retryLogic';
import { RateLimiter } from './rateLimiter';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface GeocodeCacheEntry {
  lat: number;
  lng: number;
  cachedAt: string;
}

export interface GeocodeCacheData {
  [address: string]: GeocodeCacheEntry;
}

export interface GeocodeResult {
  coordinates: GeoCoordinates | null;
  source: 'cache' | 'nominatim' | 'failed';
  address: string;
}

export interface GeocodeStats {
  total: number;
  success: number;
  failed: number;
  cached: number;
  apiCalls: number;
}

/**
 * Geocoding service with intelligent caching and rate limiting
 * Respects Nominatim ToS (1 req/sec max, proper User-Agent)
 */
export class Geocoder {
  private cache: GeocodeCacheData = {};
  private cacheFilePath: string;
  private rateLimiter: RateLimiter;
  private stats: GeocodeStats = {
    total: 0,
    success: 0,
    failed: 0,
    cached: 0,
    apiCalls: 0,
  };

  constructor(
    cacheFilePath?: string,
    rateLimitPerSecond: number = 1
  ) {
    // Default cache path: backend/data/geocode-cache.json
    this.cacheFilePath = cacheFilePath || path.join(
      process.cwd(),
      'data',
      'geocode-cache.json'
    );

    // Ensure data directory exists
    const dataDir = path.dirname(this.cacheFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing cache
    this.loadCache();

    // Initialize rate limiter (Nominatim ToS: 1 req/sec max)
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: rateLimitPerSecond,
      interval: 'second',
      maxTokens: rateLimitPerSecond,
    });

    console.log(`📍 Geocoder initialized with ${Object.keys(this.cache).length} cached addresses`);
  }

  /**
   * Geocodes an address with caching and retry logic
   * 
   * @param street - Street address
   * @param postalCode - Postal code
   * @param city - City name
   * @param country - Country (default: France)
   * @returns Coordinates or null if geocoding failed
   */
  async geocode(
    street: string,
    postalCode: string,
    city: string,
    country: string = 'France'
  ): Promise<GeocodeResult> {
    this.stats.total++;

    // Normalize address for cache key
    const address = this.normalizeAddress(street, postalCode, city, country);

    // Check cache first
    const cached = this.getFromCache(address);
    if (cached) {
      this.stats.cached++;
      this.stats.success++;
      return {
        coordinates: cached,
        source: 'cache',
        address,
      };
    }

    // Geocode via Nominatim with retry logic
    try {
      const coordinates = await this.geocodeWithNominatim(address);
      
      if (coordinates) {
        this.stats.success++;
        this.stats.apiCalls++;
        this.addToCache(address, coordinates);
        return {
          coordinates,
          source: 'nominatim',
          address,
        };
      }

      this.stats.failed++;
      return {
        coordinates: null,
        source: 'failed',
        address,
      };
    } catch (error) {
      this.stats.failed++;
      console.error(`❌ Geocoding failed for "${address}":`, error);
      return {
        coordinates: null,
        source: 'failed',
        address,
      };
    }
  }

  /**
   * Geocodes via Nominatim with rate limiting and retry
   */
  private async geocodeWithNominatim(address: string): Promise<GeoCoordinates | null> {
    return withRetry(
      async () => {
        // Wait for rate limiter token
        await this.rateLimiter.take();

        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'GodsPlan/1.0 (contact@godsplan.app)',
          },
          timeout: 10000, // 10s timeout
        });

        if (response.data && response.data.length > 0) {
          const result = response.data[0];
          return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          };
        }

        return null;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }
    );
  }

  /**
   * Normalizes address for consistent cache keys
   */
  private normalizeAddress(
    street: string,
    postalCode: string,
    city: string,
    country: string
  ): string {
    return `${street}, ${postalCode} ${city}, ${country}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Gets coordinates from cache
   */
  private getFromCache(address: string): GeoCoordinates | null {
    const entry = this.cache[address];
    if (!entry) {
      return null;
    }

    // Optional: invalidate old cache entries (e.g., >90 days)
    const cacheAge = Date.now() - new Date(entry.cachedAt).getTime();
    const maxAgeMs = 90 * 24 * 60 * 60 * 1000; // 90 days

    if (cacheAge > maxAgeMs) {
      delete this.cache[address];
      return null;
    }

    return {
      lat: entry.lat,
      lng: entry.lng,
    };
  }

  /**
   * Adds coordinates to cache and persists
   */
  private addToCache(address: string, coordinates: GeoCoordinates): void {
    this.cache[address] = {
      lat: coordinates.lat,
      lng: coordinates.lng,
      cachedAt: new Date().toISOString(),
    };

    // Persist to disk (debounced in real usage, immediate for now)
    this.saveCache();
  }

  /**
   * Loads cache from disk
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        this.cache = JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load geocode cache:', error);
      this.cache = {};
    }
  }

  /**
   * Saves cache to disk
   */
  private saveCache(): void {
    try {
      fs.writeFileSync(
        this.cacheFilePath,
        JSON.stringify(this.cache, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('❌ Failed to save geocode cache:', error);
    }
  }

  /**
   * Gets current geocoding statistics
   */
  getStats(): GeocodeStats {
    return { ...this.stats };
  }

  /**
   * Resets statistics (keeps cache intact)
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      cached: 0,
      apiCalls: 0,
    };
  }

  /**
   * Gets cache size
   */
  getCacheSize(): number {
    return Object.keys(this.cache).length;
  }

  /**
   * Manually clears cache
   */
  clearCache(): void {
    this.cache = {};
    this.saveCache();
    console.log('🗑️ Geocode cache cleared');
  }

  /**
   * Logs a summary of geocoding performance
   */
  logSummary(): void {
    const stats = this.getStats();
    const successRate = stats.total > 0 
      ? ((stats.success / stats.total) * 100).toFixed(1)
      : '0.0';
    const cacheHitRate = stats.total > 0
      ? ((stats.cached / stats.total) * 100).toFixed(1)
      : '0.0';

    console.log('\n📊 Geocoding Summary:');
    console.log(`   Total requests: ${stats.total}`);
    console.log(`   ✅ Success: ${stats.success} (${successRate}%)`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   💾 Cache hits: ${stats.cached} (${cacheHitRate}%)`);
    console.log(`   🌐 API calls: ${stats.apiCalls}`);
    console.log(`   📦 Cache size: ${this.getCacheSize()} addresses\n`);
  }
}

/**
 * Singleton instance for global use
 */
let geocoderInstance: Geocoder | null = null;

export function getGeocoder(): Geocoder {
  if (!geocoderInstance) {
    geocoderInstance = new Geocoder();
  }
  return geocoderInstance;
}
