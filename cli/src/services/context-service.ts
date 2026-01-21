/**
 * ContextService - Gathers context information for task execution
 *
 * Extracts context-gathering logic from commands layer to maintain
 * proper layer separation (commands should only parse args and format output).
 */

import { ITaskRepository } from '../repositories/task-repository';
import { IStateRepository } from '../repositories/state-repository';
import { IFileSystem } from '../infrastructure/file-system';
import { ILogger } from '../infrastructure/logger';
import { Task } from '../domain/task-entity';
import * as path from 'path';

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  message: string;
  time: string;
}

/**
 * Git information structure
 */
export interface GitInfo {
  branch?: string;
  recentCommits?: GitCommit[];
  error?: string;
}

/**
 * Progress statistics structure
 */
export interface TaskProgressStats {
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
  total: number;
  percentage: number;
}

/**
 * Dependency status structure
 */
export interface DependencyStatus {
  id: string;
  status: string;
  satisfied: boolean;
}

/**
 * Full task context structure
 */
export interface TaskContext {
  currentDirectory: string;
  git: GitInfo;
  state: any | null;
  progress: TaskProgressStats;
  recentActivity: string[];
  dependencyStatus: DependencyStatus[];
}

/**
 * Git command executor interface for dependency injection
 */
export interface IGitExecutor {
  exec(command: string): string;
}

/**
 * Default git executor using child_process
 */
export class ShellGitExecutor implements IGitExecutor {
  exec(command: string): string {
    const { execSync } = require('child_process');
    return execSync(command, { encoding: 'utf-8' }).trim();
  }
}

/**
 * IContextService interface for dependency injection
 */
export interface IContextService {
  /**
   * Gather comprehensive context for a task
   */
  gatherTaskContext(task: Task): Promise<TaskContext>;

  /**
   * Get git repository information
   */
  getGitInfo(): GitInfo;

  /**
   * Get progress statistics
   */
  getTaskProgressStats(): Promise<TaskProgressStats>;
}

/**
 * ContextService implementation
 */
export class ContextService implements IContextService {
  constructor(
    private taskRepository: ITaskRepository,
    private stateRepository: IStateRepository,
    private fileSystem: IFileSystem,
    private logger: ILogger,
    private workspaceDir: string,
    private gitExecutor: IGitExecutor = new ShellGitExecutor()
  ) {}

  async gatherTaskContext(task: Task): Promise<TaskContext> {
    this.logger.debug('Gathering task context', { taskId: task.id });

    const [git, state, progress, recentActivity, dependencyStatus] = await Promise.all([
      Promise.resolve(this.getGitInfo()),
      this.stateRepository.get(),
      this.getTaskProgressStats(),
      this.getRecentActivity(),
      this.getDependencyStatus(task),
    ]);

    return {
      currentDirectory: process.cwd(),
      git,
      state: state?.toJSON() || null,
      progress,
      recentActivity,
      dependencyStatus,
    };
  }

  getGitInfo(): GitInfo {
    try {
      const gitBranch = this.gitExecutor.exec('git branch --show-current');
      // Get last 5 commits, each on a separate line
      const gitLog = this.gitExecutor.exec('git log -5 --pretty=format:"%h|%s|%ar"');

      const recentCommits: GitCommit[] = gitLog.split('\n').map((line) => {
        const [hash, message, time] = line.split('|');
        return { hash, message, time };
      });

      return {
        branch: gitBranch,
        recentCommits,
      };
    } catch {
      return { error: 'Not a git repository or no commits' };
    }
  }

  async getTaskProgressStats(): Promise<TaskProgressStats> {
    const allTasks = await this.taskRepository.findAll();

    const completed = allTasks.filter((t) => t.status === 'completed').length;
    const failed = allTasks.filter((t) => t.status === 'failed').length;
    const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
    const pending = allTasks.filter((t) => t.status === 'pending').length;
    const total = allTasks.length;

    return {
      completed,
      failed,
      inProgress,
      pending,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  private async getRecentActivity(): Promise<string[]> {
    const progressLog = path.join(this.workspaceDir, '.ralph-dev', 'progress.log');

    try {
      const exists = await this.fileSystem.exists(progressLog);
      if (!exists) {
        return [];
      }

      const logContent = await this.fileSystem.readFile(progressLog, 'utf-8');
      const content = typeof logContent === 'string' ? logContent : logContent.toString('utf-8');
      const lines = content.trim().split('\n');
      return lines.slice(-5);
    } catch {
      return ['Unable to read progress log'];
    }
  }

  private async getDependencyStatus(task: Task): Promise<DependencyStatus[]> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return [];
    }

    const dependencyStatus: DependencyStatus[] = [];

    for (const depId of task.dependencies) {
      const depTask = await this.taskRepository.findById(depId);
      if (depTask) {
        dependencyStatus.push({
          id: depId,
          status: depTask.status,
          satisfied: depTask.status === 'completed',
        });
      } else {
        dependencyStatus.push({
          id: depId,
          status: 'unknown',
          satisfied: false,
        });
      }
    }

    return dependencyStatus;
  }
}
