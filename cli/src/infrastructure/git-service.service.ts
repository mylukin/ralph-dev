import { exec } from 'child_process';
import { promisify } from 'util';
import { IGitService } from './git-service';
import { withRetry } from '../core/retry';

const execAsync = promisify(exec);

/**
 * GitService implements IGitService interface with retry logic
 *
 * All git operations are wrapped with retry logic to handle
 * transient errors like ETIMEDOUT, ECONNRESET, and ENOTFOUND.
 * This provides resilience against temporary network issues.
 *
 * @example
 * ```typescript
 * const gitService = new GitService();
 * await gitService.commit('feat: add new feature');
 * await gitService.push('origin', 'main');
 * ```
 */
export class GitService implements IGitService {
  /**
   * Stash current changes with retry logic
   * @param message - Optional stash message
   * @returns Git command output
   */
  async stash(message?: string): Promise<string> {
    const command = message ? `git stash push -m "${message}"` : 'git stash';

    return withRetry(
      async () => {
        const { stdout } = await execAsync(command);
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Pop most recent stashed changes with retry logic
   * @returns Git command output
   */
  async unstash(): Promise<string> {
    return withRetry(
      async () => {
        const { stdout } = await execAsync('git stash pop');
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Commit staged changes with retry logic
   * @param message - Commit message
   * @returns Git command output
   */
  async commit(message: string): Promise<string> {
    // Escape double quotes in commit message
    const escapedMessage = message.replace(/"/g, '\\"');
    const command = `git commit -m "${escapedMessage}"`;

    return withRetry(
      async () => {
        const { stdout } = await execAsync(command);
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Push commits to remote repository with retry logic
   * @param remote - Remote name (default: uses git default)
   * @param branch - Branch name (default: uses current branch)
   * @returns Git command output
   */
  async push(remote?: string, branch?: string): Promise<string> {
    let command = 'git push';
    if (remote) {
      command += ` ${remote}`;
      if (branch) {
        command += ` ${branch}`;
      }
    }

    return withRetry(
      async () => {
        const { stdout } = await execAsync(command);
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Get git status with retry logic
   * @returns Git status output
   */
  async status(): Promise<string> {
    return withRetry(
      async () => {
        const { stdout } = await execAsync('git status');
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Get git diff with retry logic
   * @param options - Optional git diff options (e.g., '--staged', '--cached')
   * @returns Git diff output
   */
  async diff(options?: string): Promise<string> {
    const command = options ? `git diff ${options}` : 'git diff';

    return withRetry(
      async () => {
        const { stdout } = await execAsync(command);
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }

  /**
   * Get git log with retry logic
   * @param count - Number of commits to retrieve (default: 10)
   * @returns Git log output
   */
  async log(count: number = 10): Promise<string> {
    return withRetry(
      async () => {
        const { stdout } = await execAsync(`git log -${count}`);
        return stdout;
      },
      {
        retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'],
      }
    );
  }
}
