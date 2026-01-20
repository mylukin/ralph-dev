/**
 * Infrastructure layer exports
 *
 * This module provides abstractions for external dependencies
 * like file system operations and git operations, making them easier to test and swap.
 */

export { IFileSystem, WriteFileOptions } from './file-system';
export { FileSystemService } from './file-system.service';
export { IGitService } from './git-service';
export { GitService } from './git-service.service';
export { ILogger } from './logger';
export { ConsoleLogger } from './logger.service';
