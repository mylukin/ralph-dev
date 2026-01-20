/**
 * Retry configuration interface
 */
export interface RetryConfig {
  /** Maximum number of attempts (including initial attempt) */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay cap in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Error codes that should trigger retry */
  retryableErrors: string[];
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: ['EBUSY', 'ENOENT', 'EAGAIN', 'ETIMEDOUT'],
};

/**
 * Sleep utility for delay between retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable based on its error code
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  return error && typeof error.code === 'string' && retryableErrors.includes(error.code);
}

/**
 * Execute an operation with retry logic and exponential backoff
 *
 * @param operation - The async operation to execute
 * @param config - Partial retry configuration (merged with defaults)
 * @returns The result of the operation
 * @throws The original error if all retries are exhausted or if error is not retryable
 *
 * @example
 * ```typescript
 * // Retry file operation with defaults
 * const data = await withRetry(() => fs.readFile('file.txt', 'utf-8'));
 *
 * // Custom configuration
 * const result = await withRetry(
 *   () => apiCall(),
 *   { maxAttempts: 5, initialDelay: 200 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  // Merge provided config with defaults
  const finalConfig: RetryConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  let delay = finalConfig.initialDelay;
  let lastError: any;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const shouldRetry = isRetryableError(error, finalConfig.retryableErrors);

      // If not retryable or last attempt, throw immediately
      if (!shouldRetry || attempt === finalConfig.maxAttempts) {
        throw error;
      }

      // Wait before next retry with exponential backoff
      await sleep(delay);

      // Calculate next delay with exponential backoff, capped at maxDelay
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
