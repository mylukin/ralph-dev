/**
 * File system interface for abstraction and testability
 *
 * This interface provides a clean abstraction over file system operations,
 * making it easy to mock in tests and swap implementations if needed.
 */

/**
 * Options for writeFile operation
 */
export interface WriteFileOptions {
  /** File encoding */
  encoding?: BufferEncoding;
  /** File mode (permission and sticky bits) */
  mode?: number | string;
  /** File flags */
  flag?: string;
}

/**
 * IFileSystem interface defines all file system operations
 * that the application needs. All operations are wrapped with
 * retry logic to handle transient file system errors.
 */
export interface IFileSystem {
  /**
   * Read file content
   * @param path - Path to the file
   * @param encoding - Character encoding (default: 'utf-8')
   * @returns File content as string or Buffer
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;

  /**
   * Write data to file
   * @param path - Path to the file
   * @param data - Data to write (string or Buffer)
   * @param options - Write options (encoding, mode, flag)
   */
  writeFile(path: string, data: string | Buffer, options?: WriteFileOptions): Promise<void>;

  /**
   * Check if path exists
   * @param path - Path to check
   * @returns true if path exists, false otherwise
   */
  exists(path: string): Promise<boolean>;

  /**
   * Ensure directory exists, creating it if necessary
   * @param path - Directory path
   */
  ensureDir(path: string): Promise<void>;

  /**
   * Remove file or directory
   * @param path - Path to remove
   */
  remove(path: string): Promise<void>;

  /**
   * Read directory contents
   * @param path - Directory path
   * @returns Array of file/directory names
   */
  readdir(path: string): Promise<string[]>;
}
