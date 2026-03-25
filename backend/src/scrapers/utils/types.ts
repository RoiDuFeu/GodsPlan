/**
 * Shared types for GodsPlan scrapers
 */

/**
 * Standardized scraper error types for better error handling
 */
export enum ScraperErrorType {
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  PARSING = 'PARSING',
  RESOURCE = 'RESOURCE',
  TIMEOUT = 'TIMEOUT',
  AUTH = 'AUTH',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for scraper-specific errors
 */
export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly type: ScraperErrorType,
    public readonly isRetryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ScraperError';
    Object.setPrototypeOf(this, ScraperError.prototype);
  }

  static network(message: string, cause?: Error): ScraperError {
    return new ScraperError(message, ScraperErrorType.NETWORK, true, cause);
  }

  static rateLimit(message: string, retryAfterMs?: number): ScraperError {
    const error = new ScraperError(message, ScraperErrorType.RATE_LIMIT, true);
    if (retryAfterMs) {
      (error as any).retryAfterMs = retryAfterMs;
    }
    return error;
  }

  static parsing(message: string, cause?: Error): ScraperError {
    return new ScraperError(message, ScraperErrorType.PARSING, false, cause);
  }

  static resource(message: string, cause?: Error): ScraperError {
    return new ScraperError(message, ScraperErrorType.RESOURCE, true, cause);
  }

  static timeout(message: string): ScraperError {
    return new ScraperError(message, ScraperErrorType.TIMEOUT, true);
  }
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: ScraperErrorType[];
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  tokensPerInterval: number;
  interval: 'second' | 'minute' | 'hour';
  maxTokens?: number;
}

/**
 * Normalized coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Parsed address components
 */
export interface ParsedAddress {
  street: string;
  postalCode: string;
  city: string;
  district?: string;
  country?: string;
}
