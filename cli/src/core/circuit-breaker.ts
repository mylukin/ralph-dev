/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping operations that repeatedly fail.
 * Implements three states: CLOSED, OPEN, HALF_OPEN
 *
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'CLOSED',

  /** Fast-fail mode - requests fail immediately */
  OPEN = 'OPEN',

  /** Testing recovery - limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;

  /** Time in milliseconds before attempting reset (default: 60000 = 1 minute) */
  timeout?: number;

  /** Number of successes needed to close circuit from HALF_OPEN (default: 2) */
  successThreshold?: number;
}

/**
 * Circuit breaker metrics for monitoring
 */
export interface CircuitBreakerMetrics {
  /** Current circuit state */
  state: CircuitState;

  /** Number of consecutive failures */
  failureCount: number;

  /** Number of consecutive successes in HALF_OPEN state */
  successCount: number;

  /** Timestamp of last failure (null if no failures) */
  lastFailureTime: number | null;
}

/**
 * Circuit Breaker implementation
 *
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker({ failureThreshold: 5, timeout: 60000 });
 *
 * try {
 *   const result = await breaker.execute(() => riskyOperation());
 *   console.log('Success:', result);
 * } catch (error) {
 *   console.error('Failed:', error);
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;

  private readonly failureThreshold: number;
  private readonly timeout: number;
  private readonly successThreshold: number;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.timeout = config.timeout ?? 60000; // 1 minute default
    this.successThreshold = config.successThreshold ?? 2;
  }

  /**
   * Execute an operation with circuit breaker protection
   *
   * @param operation - The async operation to execute
   * @returns Promise resolving to operation result
   * @throws Error if circuit is OPEN or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      // Execute the operation
      const result = await operation();

      // Operation succeeded
      this.onSuccess();

      return result;
    } catch (error) {
      // Operation failed
      this.onFailure();

      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // Increment success count in HALF_OPEN state
      this.successCount++;

      // Check if we have enough successes to close the circuit
      if (this.successCount >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens the circuit
      this.state = CircuitState.OPEN;
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've reached the failure threshold
      if (this.failureCount >= this.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Check if enough time has passed to attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (this.lastFailureTime === null) {
      return false;
    }

    return Date.now() - this.lastFailureTime >= this.timeout;
  }
}
