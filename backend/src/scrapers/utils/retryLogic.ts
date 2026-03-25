/**
 * Retry logic with exponential backoff for resilient scraping
 */

import { RetryOptions, ScraperError, ScraperErrorType } from './types';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    ScraperErrorType.NETWORK,
    ScraperErrorType.RATE_LIMIT,
    ScraperErrorType.TIMEOUT,
    ScraperErrorType.RESOURCE,
  ],
};

/**
 * Executes an async function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 *
 * @example
 * ```ts
 * const data = await withRetry(
 *   async () => fetchDataFromAPI(),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < config.maxAttempts) {
    attempt++;

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const isRetryable = shouldRetry(error, config);

      if (!isRetryable || attempt >= config.maxAttempts) {
        throw error;
      }

      const delayMs = calculateBackoff(attempt, config, error);

      console.warn(
        `⚠️ Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}. Retrying in ${delayMs}ms...`
      );

      await sleep(delayMs);
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

/**
 * Determines if an error should trigger a retry
 */
function shouldRetry(error: unknown, config: RetryOptions): boolean {
  if (!(error instanceof ScraperError)) {
    // Unknown errors are not retryable by default
    return false;
  }

  if (!error.isRetryable) {
    return false;
  }

  return config.retryableErrors?.includes(error.type) ?? true;
}

/**
 * Calculates exponential backoff delay with jitter
 *
 * @param attempt - Current attempt number (1-indexed)
 * @param config - Retry configuration
 * @param error - The error that triggered retry
 * @returns Delay in milliseconds
 */
function calculateBackoff(
  attempt: number,
  config: RetryOptions,
  error: unknown
): number {
  // Check if error specifies retryAfter (e.g., 429 rate limit)
  if (error instanceof ScraperError && 'retryAfterMs' in error) {
    const retryAfterMs = (error as any).retryAfterMs as number;
    return Math.min(retryAfterMs, config.maxDelayMs);
  }

  // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay =
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);

  return Math.round(jitter);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit breaker state
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

/**
 * Circuit breaker for preventing cascading failures
 *
 * @example
 * ```ts
 * const breaker = new CircuitBreaker({ failureThreshold: 5, timeout: 60000 });
 *
 * try {
 *   await breaker.execute(async () => fetchData());
 * } catch (error) {
 *   // Handle circuit open or function error
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();

  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Executes a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw ScraperError.resource('Circuit breaker is OPEN');
      }

      // Transition to half-open to test if service recovered
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handles successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  /**
   * Handles failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  /**
   * Gets current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually resets circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}
