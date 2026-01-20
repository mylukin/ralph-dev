/**
 * Circuit Breaker Usage Examples
 *
 * This file demonstrates how to use the Circuit Breaker pattern
 * in different scenarios within the Ralph-dev CLI.
 */

import { CircuitBreaker, CircuitState } from './circuit-breaker';

// ============================================================================
// Example 1: Protecting AI Healing Attempts
// ============================================================================

/**
 * Wrap AI healing operations with circuit breaker to prevent
 * cascading failures when the AI service is unavailable
 */
async function healTaskWithCircuitBreaker(taskId: string): Promise<void> {
  // Configure circuit breaker for AI operations
  const healingBreaker = new CircuitBreaker({
    failureThreshold: 3,      // Open circuit after 3 consecutive failures
    timeout: 120000,          // Wait 2 minutes before retry
    successThreshold: 2,      // Need 2 successes to close circuit
  });

  try {
    const result = await healingBreaker.execute(async () => {
      // Simulated AI healing operation
      const response = await fetch('http://ai-service/heal', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      return response.json();
    });

    console.log('✓ Healing successful:', result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage === 'Circuit breaker is OPEN') {
      console.error('⚠ AI service unavailable, circuit breaker OPEN');
      console.error('  Will retry in 2 minutes');
    } else {
      console.error('✗ Healing failed:', error);
    }

    // Check circuit state for monitoring
    const metrics = healingBreaker.getMetrics();
    console.log('Circuit metrics:', metrics);
  }
}

// ============================================================================
// Example 2: Protecting File System Operations
// ============================================================================

/**
 * Use circuit breaker for file operations that might fail due to
 * disk issues, permissions, or filesystem locks
 */
export async function readTaskFileWithRetry(filePath: string): Promise<string> {
  const fsBreaker = new CircuitBreaker({
    failureThreshold: 5,      // More lenient for transient FS errors
    timeout: 30000,           // Retry after 30 seconds
    successThreshold: 1,      // Close circuit after 1 success
  });

  return await fsBreaker.execute(async () => {
    const fs = await import('fs/promises');
    return await fs.readFile(filePath, 'utf-8');
  });
}

// ============================================================================
// Example 3: Monitoring Circuit Breaker State
// ============================================================================

/**
 * Monitor circuit breaker state and emit metrics for observability
 */
class CircuitBreakerMonitor {
  private breakers = new Map<string, CircuitBreaker>();

  registerBreaker(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker);
  }

  /**
   * Get metrics from all registered circuit breakers
   */
  getAllMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }

  /**
   * Check if any circuit is OPEN (system health check)
   */
  areAnyCircuitsOpen(): boolean {
    for (const breaker of this.breakers.values()) {
      if (breaker.getState() === CircuitState.OPEN) {
        return true;
      }
    }
    return false;
  }

  /**
   * Print circuit breaker status to console
   */
  printStatus(): void {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   📊 CIRCUIT BREAKER STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const [name, breaker] of this.breakers.entries()) {
      const metrics = breaker.getMetrics();
      const stateIcon = this.getStateIcon(metrics.state);

      console.log(`${stateIcon} ${name}:`);
      console.log(`  State: ${metrics.state}`);
      console.log(`  Failures: ${metrics.failureCount}`);
      console.log(`  Successes: ${metrics.successCount}`);
      if (metrics.lastFailureTime) {
        const elapsed = Date.now() - metrics.lastFailureTime;
        console.log(`  Last failure: ${Math.floor(elapsed / 1000)}s ago`);
      }
      console.log('');
    }
  }

  private getStateIcon(state: CircuitState): string {
    switch (state) {
      case CircuitState.CLOSED:
        return '✓';
      case CircuitState.OPEN:
        return '✗';
      case CircuitState.HALF_OPEN:
        return '⚠';
      default:
        return '?';
    }
  }
}

// ============================================================================
// Example 4: Integration with Phase 4 (Healing)
// ============================================================================

/**
 * Example of how to integrate circuit breaker into Phase 4 healing workflow
 */
async function phase4HealingWithCircuitBreaker(
  taskId: string,
  maxAttempts: number = 5
): Promise<void> {
  // Circuit breaker prevents infinite healing loops
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    timeout: 60000,
    successThreshold: 2,
  });

  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      console.log(`\n🔧 Healing attempt ${attempt}/${maxAttempts} for ${taskId}`);

      await breaker.execute(async () => {
        // Simulated healing agent call
        const success = Math.random() > 0.5; // 50% success rate
        if (!success) {
          throw new Error('Healing failed');
        }
        return { status: 'fixed', taskId };
      });

      console.log('✓ Task healed successfully');
      break;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === 'Circuit breaker is OPEN') {
        console.error('⚠ Circuit breaker OPEN - stopping healing attempts');
        console.error('  The healing agent is experiencing repeated failures');
        console.error('  Waiting for manual intervention or system recovery');

        // Log to saga for rollback
        await logHealingFailure(taskId, 'Circuit breaker opened');
        break;
      }

      console.error(`✗ Attempt ${attempt} failed:`, errorMessage);

      // Check if we should continue
      const metrics = breaker.getMetrics();
      if (metrics.state === CircuitState.OPEN) {
        console.error('  Circuit now OPEN, stopping retries');
        break;
      }
    }
  }

  // Report final status
  const metrics = breaker.getMetrics();
  console.log('\nFinal circuit state:', metrics);
}

async function logHealingFailure(taskId: string, reason: string): Promise<void> {
  // Placeholder for saga logging
  console.log(`[SAGA] Healing failed for ${taskId}: ${reason}`);
}

// ============================================================================
// Example 5: Global Circuit Breaker Service
// ============================================================================

/**
 * Singleton service for managing circuit breakers across the CLI
 */
export class CircuitBreakerService {
  private static instance: CircuitBreakerService;
  private breakers = new Map<string, CircuitBreaker>();
  private monitor: CircuitBreakerMonitor;

  private constructor() {
    this.monitor = new CircuitBreakerMonitor();
  }

  static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService();
    }
    return CircuitBreakerService.instance;
  }

  /**
   * Get or create a circuit breaker for a specific operation
   */
  getBreaker(name: string, config?: any): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(config);
      this.breakers.set(name, breaker);
      this.monitor.registerBreaker(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get monitoring interface
   */
  getMonitor(): CircuitBreakerMonitor {
    return this.monitor;
  }

  /**
   * Execute operation with named circuit breaker
   */
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    config?: any
  ): Promise<T> {
    const breaker = this.getBreaker(name, config);
    return await breaker.execute(operation);
  }
}

// ============================================================================
// Usage Example
// ============================================================================

export async function main() {
  console.log('Circuit Breaker Examples\n');

  // Example 1: Simple usage
  await healTaskWithCircuitBreaker('auth.login');

  // Example 4: Phase 4 healing
  await phase4HealingWithCircuitBreaker('setup.scaffold');

  // Example 5: Using global service
  const service = CircuitBreakerService.getInstance();

  try {
    const result = await service.execute(
      'ai-service',
      async () => {
        // Your operation here
        return { status: 'ok' };
      },
      { failureThreshold: 3, timeout: 60000 }
    );
    console.log('Result:', result);
  } catch (error: unknown) {
    console.error('Error:', error);
  }

  // Monitor status
  service.getMonitor().printStatus();
}

// Uncomment to run examples:
// main().catch(console.error);
