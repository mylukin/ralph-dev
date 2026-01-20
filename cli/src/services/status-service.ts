/**
 * StatusService - Business logic for project progress tracking
 *
 * Calculates overall project status, task statistics, and module-level progress.
 * Uses dependency injection for repositories and logger.
 */

import { ITaskRepository } from '../repositories/task-repository';
import { IStateRepository, Phase } from '../repositories/state-repository';
import { ILogger } from '../infrastructure/logger';
import { Task } from '../domain/task-entity';

/**
 * Overall progress statistics
 */
export interface ProgressStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  blocked: number;
  completionPercentage: number;
}

/**
 * Module-level progress statistics
 */
export interface ModuleStats {
  module: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  blocked: number;
  completionPercentage: number;
}

/**
 * Complete project status snapshot
 */
export interface ProjectStatus {
  overall: ProgressStats;
  byModule: ModuleStats[];
  currentPhase: Phase | 'none';
  currentTask: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  hasActiveTasks: boolean;
}

/**
 * IStatusService interface for dependency injection
 */
export interface IStatusService {
  /**
   * Get comprehensive project status
   * @returns Complete project status including overall and module-level stats
   */
  getProjectStatus(): Promise<ProjectStatus>;
}

/**
 * StatusService implementation
 */
export class StatusService implements IStatusService {
  constructor(
    private taskRepository: ITaskRepository,
    private stateRepository: IStateRepository,
    private logger: ILogger
  ) {}

  /**
   * Get comprehensive project status
   */
  async getProjectStatus(): Promise<ProjectStatus> {
    this.logger.debug('Calculating project status...');

    // Fetch all tasks and current state in parallel
    const [allTasks, currentState] = await Promise.all([
      this.taskRepository.findAll(),
      this.stateRepository.get(),
    ]);

    // Calculate overall statistics
    const overall = this.calculateOverallStats(allTasks);

    // Calculate module-level statistics
    const byModule = this.calculateModuleStats(allTasks);

    // Build project status
    const status: ProjectStatus = {
      overall,
      byModule,
      currentPhase: currentState?.phase ?? 'none',
      currentTask: currentState?.currentTask ?? null,
      startedAt: currentState ? currentState.startedAt.toISOString() : null,
      updatedAt: currentState ? currentState.updatedAt.toISOString() : null,
      hasActiveTasks: allTasks.length > 0,
    };

    this.logger.debug('Project status calculated', { totalTasks: allTasks.length });

    return status;
  }

  /**
   * Calculate overall progress statistics
   */
  private calculateOverallStats(tasks: Task[]): ProgressStats {
    const stats: ProgressStats = {
      total: tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      completionPercentage: 0,
    };

    // Count tasks by status
    for (const task of tasks) {
      switch (task.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'blocked':
          stats.blocked++;
          break;
      }
    }

    // Calculate completion percentage
    if (stats.total > 0) {
      stats.completionPercentage = Math.round((stats.completed / stats.total) * 100);
    }

    return stats;
  }

  /**
   * Calculate module-level statistics
   */
  private calculateModuleStats(tasks: Task[]): ModuleStats[] {
    // Group tasks by module
    const moduleMap = new Map<string, Task[]>();

    for (const task of tasks) {
      const module = task.module;
      if (!moduleMap.has(module)) {
        moduleMap.set(module, []);
      }
      moduleMap.get(module)!.push(task);
    }

    // Calculate stats for each module
    const moduleStats: ModuleStats[] = [];

    for (const [module, moduleTasks] of moduleMap.entries()) {
      const stats: ModuleStats = {
        module,
        total: moduleTasks.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        failed: 0,
        blocked: 0,
        completionPercentage: 0,
      };

      // Count tasks by status
      for (const task of moduleTasks) {
        switch (task.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'in_progress':
            stats.inProgress++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'blocked':
            stats.blocked++;
            break;
        }
      }

      // Calculate completion percentage
      if (stats.total > 0) {
        stats.completionPercentage = Math.round((stats.completed / stats.total) * 100);
      }

      moduleStats.push(stats);
    }

    // Sort modules by name for consistent output
    moduleStats.sort((a, b) => a.module.localeCompare(b.module));

    return moduleStats;
  }
}
