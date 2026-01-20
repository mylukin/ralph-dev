/**
 * Mock Task Repository for Testing
 *
 * Provides in-memory task storage for unit tests.
 * Implements ITaskRepository interface with synchronous operations.
 */

import { ITaskRepository, TaskFilter } from '../repositories/task-repository';
import { Task } from '../domain/task-entity';

/**
 * Mock implementation of ITaskRepository
 *
 * Stores tasks in memory using a Map for O(1) lookups.
 * Perfect for isolated unit testing without file system dependency.
 */
export class MockTaskRepository implements ITaskRepository {
  private tasks = new Map<string, Task>();

  async findById(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values());

    if (!filter) {
      return tasks;
    }

    // Apply filters
    if (filter.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }

    if (filter.module) {
      tasks = tasks.filter((t) => t.module === filter.module);
    }

    if (filter.priority !== undefined) {
      tasks = tasks.filter((t) => t.priority === filter.priority);
    }

    return tasks;
  }

  async save(task: Task): Promise<void> {
    // Create a deep copy using JSON serialization to avoid mutations
    const taskCopy = Task.fromJSON(task.toJSON());
    this.tasks.set(task.id, taskCopy);
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async findNext(): Promise<Task | null> {
    const pendingTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === 'pending'
    );

    if (pendingTasks.length === 0) {
      return null;
    }

    // Sort by priority (ascending) and return first
    pendingTasks.sort((a, b) => a.priority - b.priority);
    return pendingTasks[0];
  }

  // Test helper methods

  /**
   * Reset repository to empty state
   */
  reset(): void {
    this.tasks.clear();
  }

  /**
   * Get count of tasks in repository
   */
  count(): number {
    return this.tasks.size;
  }

  /**
   * Check if task exists
   */
  has(taskId: string): boolean {
    return this.tasks.has(taskId);
  }

  /**
   * Get all task IDs
   */
  getAllIds(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Seed repository with test data
   */
  seed(tasks: Task[]): void {
    tasks.forEach((task) => {
      this.tasks.set(task.id, Task.fromJSON(task.toJSON()));
    });
  }
}
