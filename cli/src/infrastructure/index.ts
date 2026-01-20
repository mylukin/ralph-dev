/**
 * Infrastructure layer exports
 *
 * This module provides abstractions for external dependencies
 * like file system operations, making them easier to test and swap.
 */

export { IFileSystem, WriteFileOptions } from './file-system';
export { FileSystemService } from './file-system.service';
export { ILogger } from './logger';
export { ConsoleLogger } from './logger.service';
