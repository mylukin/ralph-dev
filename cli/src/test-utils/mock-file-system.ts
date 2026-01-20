import { IFileSystem, WriteFileOptions } from '../infrastructure/file-system';
import * as path from 'path';

/**
 * Mock implementation of IFileSystem for testing
 *
 * Provides an in-memory file system that simulates real file operations
 * without touching the actual file system. Perfect for isolated unit tests.
 */
export class MockFileSystem implements IFileSystem {
  private files = new Map<string, string | Buffer>();
  private directories = new Set<string>();

  constructor() {
    // Root directory always exists
    this.directories.add('/');
  }

  /**
   * Read file content from memory
   */
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    const normalizedPath = this.normalizePath(filePath);

    if (!this.files.has(normalizedPath)) {
      const error: any = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      error.code = 'ENOENT';
      throw error;
    }

    const content = this.files.get(normalizedPath)!;

    if (encoding) {
      if (Buffer.isBuffer(content)) {
        return content.toString(encoding);
      }
      return content;
    }

    if (typeof content === 'string') {
      return Buffer.from(content);
    }

    return content;
  }

  /**
   * Write data to file in memory
   */
  async writeFile(filePath: string, data: string | Buffer, options?: WriteFileOptions): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);
    const dirPath = path.dirname(normalizedPath);

    // Ensure parent directory exists
    await this.ensureDir(dirPath);

    this.files.set(normalizedPath, data);
  }

  /**
   * Check if path exists in memory
   */
  async exists(filePath: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }

  /**
   * Ensure directory exists in memory
   */
  async ensureDir(dirPath: string): Promise<void> {
    const normalizedPath = this.normalizePath(dirPath);

    // Add all parent directories
    const parts = normalizedPath.split('/').filter(p => p);
    let currentPath = '/';

    for (const part of parts) {
      currentPath = path.join(currentPath, part);
      this.directories.add(this.normalizePath(currentPath));
    }
  }

  /**
   * Remove file or directory from memory
   */
  async remove(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);

    // Remove file
    if (this.files.has(normalizedPath)) {
      this.files.delete(normalizedPath);
      return;
    }

    // Remove directory and all contents
    if (this.directories.has(normalizedPath)) {
      // Remove all files in directory
      for (const file of this.files.keys()) {
        if (file.startsWith(normalizedPath + '/')) {
          this.files.delete(file);
        }
      }

      // Remove all subdirectories
      for (const dir of this.directories.keys()) {
        if (dir.startsWith(normalizedPath + '/') || dir === normalizedPath) {
          this.directories.delete(dir);
        }
      }
    }
  }

  /**
   * Read directory contents from memory
   */
  async readdir(dirPath: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(dirPath);

    if (!this.directories.has(normalizedPath)) {
      const error: any = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
      error.code = 'ENOENT';
      throw error;
    }

    const entries = new Set<string>();
    const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';

    // Add files in this directory
    for (const file of this.files.keys()) {
      if (file.startsWith(prefix)) {
        const relativePath = file.substring(prefix.length);
        const firstPart = relativePath.split('/')[0];
        if (firstPart) {
          entries.add(firstPart);
        }
      }
    }

    // Add subdirectories
    for (const dir of this.directories.keys()) {
      if (dir !== normalizedPath && dir.startsWith(prefix)) {
        const relativePath = dir.substring(prefix.length);
        const firstPart = relativePath.split('/')[0];
        if (firstPart) {
          entries.add(firstPart);
        }
      }
    }

    return Array.from(entries).sort();
  }

  // Helper methods for testing

  /**
   * Reset the file system to empty state
   */
  reset(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/');
  }

  /**
   * Directly set file content (bypassing directory checks)
   */
  setFile(filePath: string, content: string | Buffer): void {
    const normalizedPath = this.normalizePath(filePath);
    this.files.set(normalizedPath, content);

    // Ensure parent directories exist
    const dirPath = path.dirname(normalizedPath);
    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '/';

    for (const part of parts) {
      currentPath = path.join(currentPath, part);
      this.directories.add(this.normalizePath(currentPath));
    }
  }

  /**
   * Check if file exists (synchronous helper)
   */
  hasFile(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.has(normalizedPath);
  }

  /**
   * Check if directory exists (synchronous helper)
   */
  hasDirectory(dirPath: string): boolean {
    const normalizedPath = this.normalizePath(dirPath);
    return this.directories.has(normalizedPath);
  }

  /**
   * Get file content (synchronous helper)
   */
  getFile(filePath: string): string | Buffer | undefined {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.get(normalizedPath);
  }

  /**
   * Get all files in the mock file system
   */
  getAllFiles(): string[] {
    return Array.from(this.files.keys()).sort();
  }

  /**
   * Get all directories in the mock file system
   */
  getAllDirectories(): string[] {
    return Array.from(this.directories.keys()).sort();
  }

  /**
   * Normalize path to use forward slashes
   */
  private normalizePath(filePath: string): string {
    // Convert to forward slashes
    let normalized = filePath.replace(/\\/g, '/');

    // Remove trailing slash (except for root)
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    // Ensure absolute path
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    return normalized;
  }
}
