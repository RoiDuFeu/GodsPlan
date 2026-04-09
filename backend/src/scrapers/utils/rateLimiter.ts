/**
 * Token bucket rate limiter for API and scraping rate control
 */

import { RateLimiterConfig } from './types';

/**
 * Token bucket rate limiter implementation
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({
 *   tokensPerInterval: 10,
 *   interval: 'minute'
 * });
 *
 * await limiter.take(); // Blocks until token available
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRateMs: number;
  private lastRefill: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens ?? config.tokensPerInterval;
    this.tokens = this.maxTokens;
    this.refillRateMs = this.calculateRefillRate(config);
    this.lastRefill = Date.now();
  }

  /**
   * Takes a token from the bucket (blocks if none available)
   *
   * @param tokensNeeded - Number of tokens to consume (default: 1)
   * @returns Promise that resolves when token is available
   */
  async take(tokensNeeded: number = 1): Promise<void> {
    while (true) {
      this.refill();

      if (this.tokens >= tokensNeeded) {
        this.tokens -= tokensNeeded;
        return;
      }

      // Wait for next refill
      const tokensShort = tokensNeeded - this.tokens;
      const waitTimeMs = tokensShort * this.refillRateMs;

      await this.sleep(Math.min(waitTimeMs, 100)); // Cap wait time
    }
  }

  /**
   * Attempts to take a token without blocking
   *
   * @param tokensNeeded - Number of tokens to consume (default: 1)
   * @returns True if token was taken, false if none available
   */
  tryTake(tokensNeeded: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Gets the number of available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Gets time until next token available (in ms)
   */
  getTimeUntilNextToken(): number {
    if (this.tokens >= 1) {
      return 0;
    }

    return this.refillRateMs - (Date.now() - this.lastRefill);
  }

  /**
   * Refills tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;

    if (elapsedMs < this.refillRateMs) {
      return;
    }

    const tokensToAdd = Math.floor(elapsedMs / this.refillRateMs);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Calculates refill rate in milliseconds per token
   */
  private calculateRefillRate(config: RateLimiterConfig): number {
    const intervalMs = {
      second: 1000,
      minute: 60000,
      hour: 3600000,
    }[config.interval];

    return intervalMs / config.tokensPerInterval;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Resets the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Concurrent-safe rate limiter using a promise chain.
 * Unlike SimpleRateLimiter, this correctly spaces requests
 * even when multiple callers enter wait() concurrently.
 */
export class ConcurrentRateLimiter {
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly delayMs: number) {}

  async wait(): Promise<void> {
    const ticket = this.chain.then(
      () => new Promise<void>((r) => setTimeout(r, this.delayMs)),
    );
    this.chain = ticket;
    await ticket;
  }
}

/**
 * Simple delay-based rate limiter (legacy compatibility)
 */
export class SimpleRateLimiter {
  private lastRequestTime = 0;

  constructor(private readonly delayMs: number) {}

  /**
   * Waits if necessary to respect rate limit
   */
  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
