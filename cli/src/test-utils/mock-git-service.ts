import { IGitService } from '../infrastructure/git-service';

/**
 * Mock implementation of IGitService for testing
 *
 * Records all git operations and returns configurable responses.
 * Perfect for testing workflows that use git without actually
 * executing git commands.
 */
export class MockGitService implements IGitService {
  // Call tracking
  public stashCalls: Array<{ message?: string }> = [];
  public unstashCalls: number = 0;
  public commitCalls: Array<{ message: string }> = [];
  public pushCalls: Array<{ remote?: string; branch?: string }> = [];
  public statusCalls: number = 0;
  public diffCalls: Array<{ options?: string }> = [];
  public logCalls: Array<{ count?: number }> = [];

  // Configurable responses
  public stashResponse: string = 'Saved working directory and index state';
  public unstashResponse: string = 'On branch main\nYour branch is up to date with origin/main';
  public commitResponse: string = '[main abc123] Test commit';
  public pushResponse: string = 'To github.com:test/repo.git\n   abc123..def456  main -> main';
  public statusResponse: string = 'On branch main\nnothing to commit, working tree clean';
  public diffResponse: string = '';
  public logResponse: string = 'commit abc123\nAuthor: Test <test@example.com>\nDate: Mon Jan 1 00:00:00 2024\n\n    Initial commit';

  // Error simulation
  public shouldThrowOnStash: boolean = false;
  public shouldThrowOnUnstash: boolean = false;
  public shouldThrowOnCommit: boolean = false;
  public shouldThrowOnPush: boolean = false;
  public shouldThrowOnStatus: boolean = false;
  public shouldThrowOnDiff: boolean = false;
  public shouldThrowOnLog: boolean = false;

  /**
   * Stash current changes
   */
  async stash(message?: string): Promise<string> {
    this.stashCalls.push({ message });

    if (this.shouldThrowOnStash) {
      const error: any = new Error('git stash failed');
      error.code = 'EGITSTASH';
      throw error;
    }

    return this.stashResponse;
  }

  /**
   * Pop most recent stashed changes
   */
  async unstash(): Promise<string> {
    this.unstashCalls++;

    if (this.shouldThrowOnUnstash) {
      const error: any = new Error('git stash pop failed');
      error.code = 'EGITUNSTASH';
      throw error;
    }

    return this.unstashResponse;
  }

  /**
   * Commit staged changes
   */
  async commit(message: string): Promise<string> {
    this.commitCalls.push({ message });

    if (this.shouldThrowOnCommit) {
      const error: any = new Error('git commit failed');
      error.code = 'EGITCOMMIT';
      throw error;
    }

    return this.commitResponse;
  }

  /**
   * Push commits to remote repository
   */
  async push(remote?: string, branch?: string): Promise<string> {
    this.pushCalls.push({ remote, branch });

    if (this.shouldThrowOnPush) {
      const error: any = new Error('git push failed');
      error.code = 'EGITPUSH';
      throw error;
    }

    return this.pushResponse;
  }

  /**
   * Get git status
   */
  async status(): Promise<string> {
    this.statusCalls++;

    if (this.shouldThrowOnStatus) {
      const error: any = new Error('git status failed');
      error.code = 'EGITSTATUS';
      throw error;
    }

    return this.statusResponse;
  }

  /**
   * Get git diff
   */
  async diff(options?: string): Promise<string> {
    this.diffCalls.push({ options });

    if (this.shouldThrowOnDiff) {
      const error: any = new Error('git diff failed');
      error.code = 'EGITDIFF';
      throw error;
    }

    return this.diffResponse;
  }

  /**
   * Get git log
   */
  async log(count?: number): Promise<string> {
    this.logCalls.push({ count });

    if (this.shouldThrowOnLog) {
      const error: any = new Error('git log failed');
      error.code = 'EGITLOG';
      throw error;
    }

    return this.logResponse;
  }

  // Helper methods for testing

  /**
   * Reset all call tracking and restore default responses
   */
  reset(): void {
    // Reset call tracking
    this.stashCalls = [];
    this.unstashCalls = 0;
    this.commitCalls = [];
    this.pushCalls = [];
    this.statusCalls = 0;
    this.diffCalls = [];
    this.logCalls = [];

    // Reset error flags
    this.shouldThrowOnStash = false;
    this.shouldThrowOnUnstash = false;
    this.shouldThrowOnCommit = false;
    this.shouldThrowOnPush = false;
    this.shouldThrowOnStatus = false;
    this.shouldThrowOnDiff = false;
    this.shouldThrowOnLog = false;

    // Reset to default responses
    this.stashResponse = 'Saved working directory and index state';
    this.unstashResponse = 'On branch main\nYour branch is up to date with origin/main';
    this.commitResponse = '[main abc123] Test commit';
    this.pushResponse = 'To github.com:test/repo.git\n   abc123..def456  main -> main';
    this.statusResponse = 'On branch main\nnothing to commit, working tree clean';
    this.diffResponse = '';
    this.logResponse = 'commit abc123\nAuthor: Test <test@example.com>\nDate: Mon Jan 1 00:00:00 2024\n\n    Initial commit';
  }

  /**
   * Get the last stash call
   */
  getLastStashCall(): { message?: string } | undefined {
    return this.stashCalls[this.stashCalls.length - 1];
  }

  /**
   * Get the last commit call
   */
  getLastCommitCall(): { message: string } | undefined {
    return this.commitCalls[this.commitCalls.length - 1];
  }

  /**
   * Get the last push call
   */
  getLastPushCall(): { remote?: string; branch?: string } | undefined {
    return this.pushCalls[this.pushCalls.length - 1];
  }

  /**
   * Get the last diff call
   */
  getLastDiffCall(): { options?: string } | undefined {
    return this.diffCalls[this.diffCalls.length - 1];
  }

  /**
   * Get the last log call
   */
  getLastLogCall(): { count?: number } | undefined {
    return this.logCalls[this.logCalls.length - 1];
  }

  /**
   * Check if a specific operation was called
   */
  wasStashCalled(): boolean {
    return this.stashCalls.length > 0;
  }

  wasUnstashCalled(): boolean {
    return this.unstashCalls > 0;
  }

  wasCommitCalled(): boolean {
    return this.commitCalls.length > 0;
  }

  wasPushCalled(): boolean {
    return this.pushCalls.length > 0;
  }

  wasStatusCalled(): boolean {
    return this.statusCalls > 0;
  }

  wasDiffCalled(): boolean {
    return this.diffCalls.length > 0;
  }

  wasLogCalled(): boolean {
    return this.logCalls.length > 0;
  }
}
