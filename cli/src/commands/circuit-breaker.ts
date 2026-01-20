/**
 * Circuit Breaker Command - Manage healing circuit breaker state
 *
 * Provides CLI access to circuit breaker status and reset functionality.
 * Used to monitor and control the healing phase's error tolerance.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { CircuitState, CircuitBreakerMetrics } from '../core/circuit-breaker';
import { FileSystemService } from '../infrastructure/file-system.service';

/**
 * Persistent circuit breaker state stored in .ralph-dev/circuit-breaker.json
 */
interface PersistedCircuitState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastResetTime: number | null;
}

const DEFAULT_STATE: PersistedCircuitState = {
  state: CircuitState.CLOSED,
  failureCount: 0,
  successCount: 0,
  lastFailureTime: null,
  lastResetTime: null,
};

export function registerCircuitBreakerCommand(program: Command, workspaceDir: string): void {
  const circuitBreaker = program
    .command('circuit-breaker')
    .alias('cb')
    .description('Manage healing circuit breaker');

  const stateFilePath = path.join(workspaceDir, '.ralph-dev', 'circuit-breaker.json');
  const fileSystem = new FileSystemService();

  /**
   * Read circuit breaker state from file
   */
  async function readState(): Promise<PersistedCircuitState> {
    try {
      const exists = await fileSystem.exists(stateFilePath);
      if (!exists) {
        return { ...DEFAULT_STATE };
      }

      const content = await fileSystem.readFile(stateFilePath, 'utf-8');
      const parsed = JSON.parse(typeof content === 'string' ? content : content.toString('utf-8'));
      return {
        ...DEFAULT_STATE,
        ...parsed,
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Write circuit breaker state to file
   */
  async function writeState(state: PersistedCircuitState): Promise<void> {
    const dir = path.dirname(stateFilePath);
    await fileSystem.ensureDir(dir);
    await fileSystem.writeFile(stateFilePath, JSON.stringify(state, null, 2));
  }

  // Status command
  circuitBreaker
    .command('status')
    .description('Get circuit breaker status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const state = await readState();

        const metrics: CircuitBreakerMetrics & { lastResetTime: number | null } = {
          state: state.state,
          failureCount: state.failureCount,
          successCount: state.successCount,
          lastFailureTime: state.lastFailureTime,
          lastResetTime: state.lastResetTime,
        };

        const response = successResponse(metrics);

        outputResponse(response, options.json, (data) => {
          const stateColor =
            data.state === CircuitState.CLOSED
              ? chalk.green
              : data.state === CircuitState.OPEN
                ? chalk.red
                : chalk.yellow;

          console.log(chalk.bold('Circuit Breaker Status:'));
          console.log(`  State: ${stateColor(data.state)}`);
          console.log(`  Failure Count: ${data.failureCount}`);
          console.log(`  Success Count: ${data.successCount}`);

          if (data.lastFailureTime) {
            const lastFailure = new Date(data.lastFailureTime).toISOString();
            console.log(`  Last Failure: ${lastFailure}`);
          }

          if (data.lastResetTime) {
            const lastReset = new Date(data.lastResetTime).toISOString();
            console.log(`  Last Reset: ${lastReset}`);
          }

          if (data.state === CircuitState.OPEN) {
            console.log('');
            console.log(chalk.yellow('  ⚠ Circuit is OPEN - healing operations will fail immediately'));
            console.log(chalk.yellow('  Run "ralph-dev circuit-breaker reset" to close the circuit'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to read circuit breaker state', error), options.json);
      }
    });

  // Reset command
  circuitBreaker
    .command('reset')
    .description('Reset circuit breaker to CLOSED state')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const previousState = await readState();
        const wasOpen = previousState.state !== CircuitState.CLOSED;

        const newState: PersistedCircuitState = {
          state: CircuitState.CLOSED,
          failureCount: 0,
          successCount: 0,
          lastFailureTime: previousState.lastFailureTime,
          lastResetTime: Date.now(),
        };

        await writeState(newState);

        const response = successResponse({
          previousState: previousState.state,
          newState: newState.state,
          wasReset: wasOpen,
        });

        outputResponse(response, options.json, (data) => {
          if (data.wasReset) {
            console.log(chalk.green('✓ Circuit breaker reset'));
            console.log(`  Previous state: ${chalk.yellow(data.previousState)}`);
            console.log(`  New state: ${chalk.green(data.newState)}`);
          } else {
            console.log(chalk.yellow('Circuit breaker was already CLOSED'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to reset circuit breaker', error), options.json);
      }
    });

  // Record failure command (for programmatic use by healing phase)
  circuitBreaker
    .command('fail')
    .description('Record a failure (used by healing phase)')
    .option('--threshold <number>', 'Failure threshold before opening circuit', '5')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const threshold = parseInt(options.threshold, 10);
        const state = await readState();

        state.failureCount++;
        state.lastFailureTime = Date.now();

        // Check if we need to open the circuit
        if (state.state === CircuitState.HALF_OPEN) {
          // Any failure in HALF_OPEN reopens the circuit
          state.state = CircuitState.OPEN;
          state.successCount = 0;
        } else if (state.state === CircuitState.CLOSED && state.failureCount >= threshold) {
          state.state = CircuitState.OPEN;
        }

        await writeState(state);

        const response = successResponse({
          state: state.state,
          failureCount: state.failureCount,
          threshold,
          isOpen: state.state === CircuitState.OPEN,
        });

        outputResponse(response, options.json, (data) => {
          if (data.isOpen) {
            console.log(chalk.red(`✗ Circuit breaker OPEN (${data.failureCount}/${data.threshold} failures)`));
          } else {
            console.log(chalk.yellow(`Failure recorded (${data.failureCount}/${data.threshold})`));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to record failure', error), options.json);
      }
    });

  // Record success command (for programmatic use by healing phase)
  circuitBreaker
    .command('success')
    .description('Record a success (used by healing phase)')
    .option('--success-threshold <number>', 'Successes needed to close from HALF_OPEN', '2')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const successThreshold = parseInt(options.successThreshold, 10);
        const state = await readState();

        if (state.state === CircuitState.HALF_OPEN) {
          state.successCount++;

          if (state.successCount >= successThreshold) {
            state.state = CircuitState.CLOSED;
            state.failureCount = 0;
            state.successCount = 0;
          }
        } else if (state.state === CircuitState.CLOSED) {
          // Reset failure count on success
          state.failureCount = 0;
        }

        await writeState(state);

        const response = successResponse({
          state: state.state,
          successCount: state.successCount,
          failureCount: state.failureCount,
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green(`✓ Success recorded (state: ${data.state})`));
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to record success', error), options.json);
      }
    });
}
