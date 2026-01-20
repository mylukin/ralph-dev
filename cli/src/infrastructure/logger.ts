/**
 * Logger interface for Ralph-dev CLI
 *
 * Provides structured logging with multiple log levels.
 * Implementations should write to appropriate output streams.
 */

/**
 * Logger interface with support for structured data
 */
export interface ILogger {
  /**
   * Log debug-level message
   * @param message - Debug message
   * @param meta - Optional structured metadata
   */
  debug(message: string, meta?: Record<string, any>): void;

  /**
   * Log info-level message
   * @param message - Info message
   * @param meta - Optional structured metadata
   */
  info(message: string, meta?: Record<string, any>): void;

  /**
   * Log warning-level message
   * @param message - Warning message
   * @param meta - Optional structured metadata
   */
  warn(message: string, meta?: Record<string, any>): void;

  /**
   * Log error-level message
   * @param message - Error message
   * @param error - Optional Error object or structured metadata
   */
  error(message: string, error?: Error | Record<string, any>): void;
}
