/**
 * Example usage of withRetry function
 *
 * This file demonstrates how to use the retry infrastructure
 * in real-world scenarios within the Ralph-dev CLI.
 */

import { withRetry } from './retry';
import fs from 'fs-extra';
import path from 'path';

/**
 * Example 1: Retry file read operations
 * Use case: Reading task files that might be temporarily locked
 */
export async function readTaskFileWithRetry(taskPath: string): Promise<string> {
  return withRetry(
    async () => {
      return await fs.readFile(taskPath, 'utf-8');
    },
    {
      maxAttempts: 3,
      initialDelay: 100,
      // ENOENT, EBUSY are default retryable errors
    }
  );
}

/**
 * Example 2: Retry with custom configuration
 * Use case: Critical operations that need more retry attempts
 */
export async function writeStateWithRetry(
  statePath: string,
  state: any
): Promise<void> {
  return withRetry(
    async () => {
      await fs.ensureDir(path.dirname(statePath));
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
    },
    {
      maxAttempts: 5,
      initialDelay: 200,
      maxDelay: 3000,
      backoffMultiplier: 2,
    }
  );
}

/**
 * Example 3: Retry with custom error codes
 * Use case: Network operations with HTTP-specific error codes
 */
export async function fetchWithRetry(url: string): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url);
      if (!response.ok && response.status >= 500) {
        // Throw error with custom code for server errors
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).code = 'HTTP_SERVER_ERROR';
        throw error;
      }
      return response;
    },
    {
      retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'HTTP_SERVER_ERROR'],
      maxAttempts: 3,
    }
  );
}

/**
 * Example 4: Combine with Circuit Breaker
 * Use case: Protect against cascading failures in AI agent healing phase
 */
import { CircuitBreaker } from './circuit-breaker';

export async function healTaskWithRetryAndCircuitBreaker(
  taskId: string,
  healingAgent: () => Promise<void>
): Promise<void> {
  const breaker = new CircuitBreaker({
    failureThreshold: 5,
    timeout: 60000,
  });

  // First layer: Circuit Breaker to prevent cascading failures
  return breaker.execute(async () => {
    // Second layer: Retry with exponential backoff for transient errors
    return withRetry(
      async () => {
        await healingAgent();
      },
      {
        maxAttempts: 3,
        initialDelay: 100,
        retryableErrors: ['EBUSY', 'ETIMEDOUT', 'AGENT_TIMEOUT'],
      }
    );
  });
}

/**
 * Example 5: No retry for validation errors
 * Use case: Fail fast for non-transient errors
 */
export async function validateAndSaveTask(
  taskId: string,
  taskData: any
): Promise<void> {
  // Validation error (non-retryable)
  if (!taskId || !taskData.module) {
    const error = new Error('Invalid task data');
    (error as any).code = 'VALIDATION_ERROR';
    throw error; // Will NOT be retried
  }

  // File write (retryable on EBUSY)
  return withRetry(async () => {
    await fs.writeFile(
      `.ralph-dev/tasks/${taskData.module}/${taskId}.md`,
      JSON.stringify(taskData, null, 2)
    );
  });
}
