/**
 * HealingService - Service layer for error healing with circuit breaker
 *
 * Prevents resource exhaustion by wrapping healing operations with circuit breaker.
 * Tracks healing attempts and provides automatic failure protection.
 */

import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from '../core/circuit-breaker';
import { ILogger } from '../infrastructure/logger';
import { IFileSystem } from '../infrastructure/file-system';
import path from 'path';

/**
 * Healing attempt result
 */
export interface HealingResult {
  success: boolean;
  taskId: string;
  attemptNumber: number;
  error?: Error;
  circuitState: CircuitState;
}

/**
 * Healing operation interface
 */
export interface HealingOperation {
  /**
   * Execute the healing operation
   * @returns Promise resolving to success status
   */
  heal(): Promise<boolean>;
}

/**
 * IHealingService interface for dependency injection
 */
export interface IHealingService {
  /**
   * Attempt to heal a failed task with circuit breaker protection
   */
  attemptHealing(taskId: string, operation: HealingOperation): Promise<HealingResult>;

  /**
   * Get current circuit breaker state
   */
  getCircuitState(): CircuitState;

  /**
   * Get healing statistics
   */
  getHealingStats(): HealingStats;

  /**
   * Reset circuit breaker (for testing or manual recovery)
   */
  resetCircuit(): void;
}

/**
 * Healing statistics
 */
export interface HealingStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  circuitOpenCount: number;
  currentCircuitState: CircuitState;
}

/**
 * HealingService implementation
 */
export class HealingService implements IHealingService {
  private circuitBreaker: CircuitBreaker;
  private circuitConfig: CircuitBreakerConfig;
  private stats: HealingStats;
  private attemptsByTask: Map<string, number>;
  private lastCircuitState: CircuitState;
  private circuitBreakerLogPath: string;

  constructor(
    private logger: ILogger,
    private fileSystem: IFileSystem,
    private workspaceDir: string,
    circuitConfig?: CircuitBreakerConfig
  ) {
    this.circuitConfig = circuitConfig || {};
    this.circuitBreaker = new CircuitBreaker(this.circuitConfig);
    this.stats = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      circuitOpenCount: 0,
      currentCircuitState: CircuitState.CLOSED,
    };
    this.attemptsByTask = new Map();
    this.lastCircuitState = CircuitState.CLOSED;
    this.circuitBreakerLogPath = path.join(workspaceDir, '.ralph-dev', 'circuit-breaker.log');
  }

  async attemptHealing(taskId: string, operation: HealingOperation): Promise<HealingResult> {
    // Increment attempt counter for this task
    const attemptNumber = (this.attemptsByTask.get(taskId) || 0) + 1;
    this.attemptsByTask.set(taskId, attemptNumber);

    this.logger.info('Attempting to heal task', {
      taskId,
      attemptNumber,
      circuitState: this.getCircuitState(),
    });

    // Increment total attempts
    this.stats.totalAttempts++;

    try {
      // Execute healing operation with circuit breaker protection
      const success = await this.circuitBreaker.execute(async () => {
        return await operation.heal();
      });

      // Update stats on success
      if (success) {
        this.stats.successfulAttempts++;
        this.logger.info('Healing succeeded', {
          taskId,
          attemptNumber,
        });
      } else {
        this.stats.failedAttempts++;
        this.logger.warn('Healing operation returned false', {
          taskId,
          attemptNumber,
        });
      }

      // Check for circuit state changes and log them
      await this.checkAndLogCircuitStateChange();

      // Update current circuit state
      this.stats.currentCircuitState = this.getCircuitState();

      return {
        success,
        taskId,
        attemptNumber,
        circuitState: this.getCircuitState(),
      };
    } catch (error) {
      // Update stats on failure
      this.stats.failedAttempts++;

      const err = error instanceof Error ? error : new Error(String(error));

      // Check for circuit state changes and log them
      await this.checkAndLogCircuitStateChange();

      // Check if circuit just opened
      const newState = this.getCircuitState();
      if (newState === CircuitState.OPEN && this.stats.currentCircuitState !== CircuitState.OPEN) {
        this.stats.circuitOpenCount++;
        this.logger.error('Circuit breaker opened - healing disabled temporarily', {
          totalFailures: this.stats.failedAttempts,
          circuitOpenCount: this.stats.circuitOpenCount,
        });
      }

      this.stats.currentCircuitState = newState;

      this.logger.error('Healing failed', {
        taskId,
        attemptNumber,
        error: err.message,
        circuitState: newState,
      });

      return {
        success: false,
        taskId,
        attemptNumber,
        error: err,
        circuitState: newState,
      };
    }
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  getHealingStats(): HealingStats {
    return { ...this.stats };
  }

  resetCircuit(): void {
    this.logger.info('Resetting circuit breaker');
    // Create a new circuit breaker to reset state
    this.circuitBreaker = new CircuitBreaker(this.circuitConfig);
    this.stats.currentCircuitState = CircuitState.CLOSED;
    this.lastCircuitState = CircuitState.CLOSED;
  }

  /**
   * Check if circuit state has changed and log to file if it has
   * @private
   */
  private async checkAndLogCircuitStateChange(): Promise<void> {
    const currentState = this.getCircuitState();

    if (currentState !== this.lastCircuitState) {
      await this.logCircuitStateChange(currentState);
      this.lastCircuitState = currentState;
    }
  }

  /**
   * Log circuit state change to file system
   * @private
   */
  private async logCircuitStateChange(state: CircuitState): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Circuit state: ${state}\n`;

      await this.fileSystem.appendFile(this.circuitBreakerLogPath, logEntry, { encoding: 'utf-8' });
    } catch (error) {
      // Don't fail healing operation if logging fails
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to write to circuit breaker log', {
        error: err.message,
        path: this.circuitBreakerLogPath,
      });
    }
  }
}
