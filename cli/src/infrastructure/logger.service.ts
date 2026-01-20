/**
 * Console logger implementation
 *
 * Implements ILogger interface by writing to console methods.
 * This is a fire-and-forget implementation with no retry logic.
 */

import { ILogger } from './logger';

/**
 * ConsoleLogger writes log messages to the console
 *
 * Each log level maps to the corresponding console method:
 * - debug → console.debug
 * - info → console.info
 * - warn → console.warn
 * - error → console.error
 */
export class ConsoleLogger implements ILogger {
  /**
   * Log debug-level message
   */
  debug(message: string, meta?: Record<string, any>): void {
    if (meta !== undefined) {
      console.debug(message, meta);
    } else {
      console.debug(message);
    }
  }

  /**
   * Log info-level message
   */
  info(message: string, meta?: Record<string, any>): void {
    if (meta !== undefined) {
      console.info(message, meta);
    } else {
      console.info(message);
    }
  }

  /**
   * Log warning-level message
   */
  warn(message: string, meta?: Record<string, any>): void {
    if (meta !== undefined) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  }

  /**
   * Log error-level message
   */
  error(message: string, error?: Error | Record<string, any>): void {
    if (error !== undefined) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
}
