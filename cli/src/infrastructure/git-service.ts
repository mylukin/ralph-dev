/**
 * Git service interface for abstraction and testability
 *
 * This interface provides a clean abstraction over git operations,
 * making it easy to mock in tests and swap implementations if needed.
 * All operations are wrapped with retry logic to handle transient errors.
 */

/**
 * IGitService interface defines all git operations
 * that the application needs. All operations are wrapped with
 * retry logic to handle transient network and file system errors.
 */
export interface IGitService {
  /**
   * Stash current changes
   * @param message - Optional stash message
   * @returns Git command output
   */
  stash(message?: string): Promise<string>;

  /**
   * Pop most recent stashed changes
   * @returns Git command output
   */
  unstash(): Promise<string>;

  /**
   * Commit staged changes
   * @param message - Commit message
   * @returns Git command output
   */
  commit(message: string): Promise<string>;

  /**
   * Push commits to remote repository
   * @param remote - Remote name (default: uses git default)
   * @param branch - Branch name (default: uses current branch)
   * @returns Git command output
   */
  push(remote?: string, branch?: string): Promise<string>;

  /**
   * Get git status
   * @returns Git status output
   */
  status(): Promise<string>;

  /**
   * Get git diff
   * @param options - Optional git diff options (e.g., '--staged', '--cached')
   * @returns Git diff output
   */
  diff(options?: string): Promise<string>;

  /**
   * Get git log
   * @param count - Number of commits to retrieve (default: 10)
   * @returns Git log output
   */
  log(count?: number): Promise<string>;
}
