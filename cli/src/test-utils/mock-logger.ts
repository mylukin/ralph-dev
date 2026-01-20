import { ILogger } from '../infrastructure/logger';

/**
 * Log entry interface for tracking calls
 */
interface LogEntry {
  message: string;
  meta?: Record<string, any>;
}

interface ErrorLogEntry {
  message: string;
  error?: Error | Record<string, any>;
}

/**
 * Mock implementation of ILogger for testing
 *
 * Records all log calls without writing to console or files.
 * Perfect for verifying logging behavior in tests.
 */
export class MockLogger implements ILogger {
  // Call tracking arrays
  public debugCalls: LogEntry[] = [];
  public infoCalls: LogEntry[] = [];
  public warnCalls: LogEntry[] = [];
  public errorCalls: ErrorLogEntry[] = [];

  /**
   * Log debug-level message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.debugCalls.push({ message, meta });
  }

  /**
   * Log info-level message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.infoCalls.push({ message, meta });
  }

  /**
   * Log warning-level message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.warnCalls.push({ message, meta });
  }

  /**
   * Log error-level message
   */
  error(message: string, error?: Error | Record<string, any>): void {
    this.errorCalls.push({ message, error });
  }

  // Helper methods for testing

  /**
   * Reset all call tracking
   */
  reset(): void {
    this.debugCalls = [];
    this.infoCalls = [];
    this.warnCalls = [];
    this.errorCalls = [];
  }

  /**
   * Get the last debug call
   */
  getLastDebug(): LogEntry | undefined {
    return this.debugCalls[this.debugCalls.length - 1];
  }

  /**
   * Get the last info call
   */
  getLastInfo(): LogEntry | undefined {
    return this.infoCalls[this.infoCalls.length - 1];
  }

  /**
   * Get the last warn call
   */
  getLastWarn(): LogEntry | undefined {
    return this.warnCalls[this.warnCalls.length - 1];
  }

  /**
   * Get the last error call
   */
  getLastError(): ErrorLogEntry | undefined {
    return this.errorCalls[this.errorCalls.length - 1];
  }

  /**
   * Check if debug was called with specific message
   */
  wasDebugCalledWith(message: string): boolean {
    return this.debugCalls.some(call => call.message === message);
  }

  /**
   * Check if info was called with specific message
   */
  wasInfoCalledWith(message: string): boolean {
    return this.infoCalls.some(call => call.message === message);
  }

  /**
   * Check if warn was called with specific message
   */
  wasWarnCalledWith(message: string): boolean {
    return this.warnCalls.some(call => call.message === message);
  }

  /**
   * Check if error was called with specific message
   */
  wasErrorCalledWith(message: string): boolean {
    return this.errorCalls.some(call => call.message === message);
  }

  /**
   * Check if debug was called
   */
  wasDebugCalled(): boolean {
    return this.debugCalls.length > 0;
  }

  /**
   * Check if info was called
   */
  wasInfoCalled(): boolean {
    return this.infoCalls.length > 0;
  }

  /**
   * Check if warn was called
   */
  wasWarnCalled(): boolean {
    return this.warnCalls.length > 0;
  }

  /**
   * Check if error was called
   */
  wasErrorCalled(): boolean {
    return this.errorCalls.length > 0;
  }

  /**
   * Get all log messages in chronological order
   */
  getAllLogs(): Array<{ level: string; message: string; meta?: any }> {
    const logs: Array<{ level: string; message: string; meta?: any }> = [];

    // Note: This returns logs in the order they were added to each array,
    // not in true chronological order across all levels.
    // For true chronological order, we'd need to add timestamps.

    this.debugCalls.forEach(call => {
      logs.push({ level: 'debug', message: call.message, meta: call.meta });
    });

    this.infoCalls.forEach(call => {
      logs.push({ level: 'info', message: call.message, meta: call.meta });
    });

    this.warnCalls.forEach(call => {
      logs.push({ level: 'warn', message: call.message, meta: call.meta });
    });

    this.errorCalls.forEach(call => {
      logs.push({ level: 'error', message: call.message, meta: call.error });
    });

    return logs;
  }

  /**
   * Get count of calls by level
   */
  getLogCounts(): { debug: number; info: number; warn: number; error: number } {
    return {
      debug: this.debugCalls.length,
      info: this.infoCalls.length,
      warn: this.warnCalls.length,
      error: this.errorCalls.length,
    };
  }

  /**
   * Check if any logs were recorded
   */
  hasLogs(): boolean {
    return (
      this.debugCalls.length > 0 ||
      this.infoCalls.length > 0 ||
      this.warnCalls.length > 0 ||
      this.errorCalls.length > 0
    );
  }
}
