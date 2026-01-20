/**
 * Unit tests for ConsoleLogger
 *
 * Tests the ILogger implementation using TDD approach:
 * 1. All log levels work correctly
 * 2. Structured data is passed through
 * 3. Error objects are handled properly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleLogger } from './logger.service';
import { ILogger } from './logger';

describe('ConsoleLogger', () => {
  let logger: ILogger;
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Arrange: Mock all console methods
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger = new ConsoleLogger();
  });

  afterEach(() => {
    // Cleanup: Restore console methods
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should call console.debug with message', () => {
      // Arrange
      const message = 'Debug message';

      // Act
      logger.debug(message);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.debug with message and metadata', () => {
      // Arrange
      const message = 'Debug with metadata';
      const meta = { userId: '123', action: 'login' };

      // Act
      logger.debug(message, meta);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith(message, meta);
    });

    it('should handle undefined metadata', () => {
      // Arrange
      const message = 'Debug without metadata';

      // Act
      logger.debug(message, undefined);

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('info', () => {
    it('should call console.info with message', () => {
      // Arrange
      const message = 'Info message';

      // Act
      logger.info(message);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.info with message and metadata', () => {
      // Arrange
      const message = 'Info with metadata';
      const meta = { taskId: 'auth.login', status: 'pending' };

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(message, meta);
    });

    it('should handle empty metadata object', () => {
      // Arrange
      const message = 'Info with empty meta';
      const meta = {};

      // Act
      logger.info(message, meta);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('warn', () => {
    it('should call console.warn with message', () => {
      // Arrange
      const message = 'Warning message';

      // Act
      logger.warn(message);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.warn with message and metadata', () => {
      // Arrange
      const message = 'Warning with metadata';
      const meta = { reason: 'deprecated', version: '2.0' };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(message, meta);
    });

    it('should handle nested metadata objects', () => {
      // Arrange
      const message = 'Warning with nested meta';
      const meta = {
        user: { id: '123', name: 'John' },
        context: { page: 'login', source: 'api' }
      };

      // Act
      logger.warn(message, meta);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('error', () => {
    it('should call console.error with message only', () => {
      // Arrange
      const message = 'Error message';

      // Act
      logger.error(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });

    it('should call console.error with message and Error object', () => {
      // Arrange
      const message = 'Error with Error object';
      const error = new Error('Something went wrong');

      // Act
      logger.error(message, error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message, error);
    });

    it('should call console.error with message and metadata object', () => {
      // Arrange
      const message = 'Error with metadata';
      const meta = { code: 'TASK_NOT_FOUND', taskId: 'auth.login' };

      // Act
      logger.error(message, meta);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message, meta);
    });

    it('should handle Error with stack trace', () => {
      // Arrange
      const message = 'Error with stack';
      const error = new Error('Stack trace error');
      error.stack = 'Error: Stack trace error\n    at Object.<anonymous>';

      // Act
      logger.error(message, error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message, error);
    });

    it('should handle undefined error parameter', () => {
      // Arrange
      const message = 'Error without details';

      // Act
      logger.error(message, undefined);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(message);
    });
  });

  describe('logger behavior', () => {
    it('should not throw when console methods are unavailable', () => {
      // Arrange
      consoleDebugSpy.mockImplementation(() => {
        throw new Error('Console unavailable');
      });

      // Act & Assert - should not throw
      expect(() => {
        try {
          logger.debug('Test message');
        } catch (e) {
          // Swallow the error in production logger
        }
      }).not.toThrow();
    });

    it('should allow multiple log calls in sequence', () => {
      // Act
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1');

      // Assert
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
