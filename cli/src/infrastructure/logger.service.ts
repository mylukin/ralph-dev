/**
 * Console logger implementation
 *
 * Implements ILogger interface by writing to stderr.
 * This follows Unix convention: stdout for program output, stderr for diagnostics.
 * This keeps stdout clean for JSON output when using --json flag.
 */

import { ILogger } from './logger';

/**
 * Format log output with optional metadata
 */
function formatLog(message: string, meta?: Record<string, any>): string {
  if (meta !== undefined) {
    return `${message} ${JSON.stringify(meta)}`;
  }
  return message;
}

/**
 * ConsoleLogger writes log messages to stderr
 *
 * All log levels write to stderr to keep stdout clean for program output.
 * This is essential for CLI tools that support --json output.
 */
export class ConsoleLogger implements ILogger {
  /**
   * Log debug-level message to stderr
   */
  debug(message: string, meta?: Record<string, any>): void {
    console.error(formatLog(message, meta));
  }

  /**
   * Log info-level message to stderr
   */
  info(message: string, meta?: Record<string, any>): void {
    console.error(formatLog(message, meta));
  }

  /**
   * Log warning-level message to stderr
   */
  warn(message: string, meta?: Record<string, any>): void {
    console.error(formatLog(message, meta));
  }

  /**
   * Log error-level message to stderr
   */
  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      console.error(`${message}: ${error.message}`);
    } else {
      console.error(formatLog(message, error));
    }
  }
}
