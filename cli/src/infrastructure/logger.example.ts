/**
 * Example usage of ILogger and ConsoleLogger
 *
 * This file demonstrates how to use the logger infrastructure
 * for structured logging in Ralph-dev CLI.
 */

import { ILogger, ConsoleLogger } from './index';

/**
 * Example 1: Basic logging at different levels
 */
function basicLoggingExample() {
  const logger: ILogger = new ConsoleLogger();

  // Debug level (typically for development)
  logger.debug('Application started');

  // Info level (general information)
  logger.info('Processing task auth.login');

  // Warning level (something unexpected but not critical)
  logger.warn('Task dependency not found, skipping');

  // Error level (critical issues)
  logger.error('Failed to parse task file');
}

/**
 * Example 2: Structured logging with metadata
 */
function structuredLoggingExample() {
  const logger: ILogger = new ConsoleLogger();

  // Log with structured metadata
  logger.info('Task started', {
    taskId: 'auth.login.ui',
    module: 'auth',
    priority: 2,
    estimatedMinutes: 25
  });

  // Log with nested metadata
  logger.debug('Processing dependency graph', {
    task: {
      id: 'auth.login.ui',
      status: 'in_progress'
    },
    dependencies: [
      'setup.scaffold',
      'auth.api.setup'
    ],
    timestamp: new Date().toISOString()
  });

  // Log warning with context
  logger.warn('Approaching rate limit', {
    current: 95,
    max: 100,
    resetAt: '2026-01-20T12:00:00Z'
  });
}

/**
 * Example 3: Error logging with Error objects
 */
function errorLoggingExample() {
  const logger: ILogger = new ConsoleLogger();

  try {
    throw new Error('Task file not found');
  } catch (error) {
    // Log error with Error object (preserves stack trace)
    logger.error('Failed to load task', error as Error);
  }

  // Log error with structured metadata
  logger.error('Validation failed', {
    code: 'INVALID_TASK_ID',
    taskId: 'invalid..id',
    reason: 'Task ID contains invalid characters'
  });
}

/**
 * Example 4: Using logger in a service class
 */
class TaskService {
  constructor(private logger: ILogger) {}

  async startTask(taskId: string): Promise<void> {
    this.logger.debug('Starting task', { taskId });

    try {
      // ... business logic ...
      this.logger.info('Task started successfully', { taskId });
    } catch (error) {
      this.logger.error('Failed to start task', {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async completeTask(taskId: string, duration: string): Promise<void> {
    this.logger.debug('Completing task', { taskId, duration });

    try {
      // ... business logic ...
      this.logger.info('Task completed', {
        taskId,
        duration,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to complete task', error as Error);
      throw error;
    }
  }
}

/**
 * Example 5: Dependency injection pattern
 */
function dependencyInjectionExample() {
  // Create logger instance
  const logger: ILogger = new ConsoleLogger();

  // Inject into services
  const taskService = new TaskService(logger);

  // Use the service
  taskService.startTask('auth.login.ui');
}

/**
 * Example 6: Logger factory pattern
 */
class LoggerFactory {
  static create(type: 'console' = 'console'): ILogger {
    switch (type) {
      case 'console':
        return new ConsoleLogger();
      default:
        return new ConsoleLogger();
    }
  }
}

function factoryPatternExample() {
  const logger = LoggerFactory.create('console');
  logger.info('Logger created via factory');
}

/**
 * Run all examples
 */
export function runExamples() {
  console.log('\n=== Example 1: Basic Logging ===\n');
  basicLoggingExample();

  console.log('\n=== Example 2: Structured Logging ===\n');
  structuredLoggingExample();

  console.log('\n=== Example 3: Error Logging ===\n');
  errorLoggingExample();

  console.log('\n=== Example 4: Service Class ===\n');
  dependencyInjectionExample();

  console.log('\n=== Example 5: Factory Pattern ===\n');
  factoryPatternExample();
}

// Uncomment to run examples
// runExamples();
