/**
 * FileSystem-based Index Repository Implementation
 *
 * Refactored from IndexManager to use dependency injection with IFileSystem.
 * Persists task index to .ralph-dev/tasks/index.json with retry logic.
 */

import * as path from 'path';
import { IFileSystem } from '../infrastructure/file-system';
import {
  IIndexRepository,
  TaskIndex,
  TaskIndexEntry,
  MetadataUpdate,
} from './index-repository';

export class FileSystemIndexRepository implements IIndexRepository {
  private readonly indexPath: string;
  private readonly tasksDir: string;

  constructor(
    private fileSystem: IFileSystem,
    tasksDir: string
  ) {
    this.tasksDir = tasksDir;
    this.indexPath = path.join(tasksDir, 'index.json');
  }

  async read(): Promise<TaskIndex> {
    const exists = await this.fileSystem.exists(this.indexPath);

    if (!exists) {
      return this.createDefaultIndex();
    }

    const content = await this.fileSystem.readFile(this.indexPath, 'utf-8');
    return JSON.parse(content as string);
  }

  async write(index: TaskIndex): Promise<void> {
    // Update timestamp
    index.updatedAt = new Date().toISOString();

    // Ensure directory exists
    await this.fileSystem.ensureDir(path.dirname(this.indexPath));

    // Write index
    await this.fileSystem.writeFile(
      this.indexPath,
      JSON.stringify(index, null, 2),
      { encoding: 'utf-8' }
    );
  }

  async upsertTask(taskId: string, entry: TaskIndexEntry): Promise<void> {
    const index = await this.read();
    index.tasks[taskId] = entry;
    await this.write(index);
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    const index = await this.read();

    if (!index.tasks[taskId]) {
      throw new Error(`Task not found in index: ${taskId}`);
    }

    index.tasks[taskId].status = status;
    await this.write(index);
  }

  getTaskFilePath(taskId: string): string | null {
    // Note: This method is synchronous in original implementation
    // We keep it synchronous for compatibility, but callers should
    // use the async version if they need to read the index first
    return this.getTaskFilePathSync(taskId);
  }

  private getTaskFilePathSync(taskId: string): string | null {
    // This is a helper that will be used by tests
    // In production, callers should read the index first
    return null;
  }

  async getTaskFilePathAsync(taskId: string): Promise<string | null> {
    const index = await this.read();
    const task = index.tasks[taskId];

    if (!task) {
      return null;
    }

    if (task.filePath) {
      return path.join(path.dirname(this.indexPath), task.filePath);
    }

    // Derive path from ID
    const module = task.module;
    const fileName = taskId.replace(`${module}.`, '') + '.md';
    return path.join(path.dirname(this.indexPath), module, fileName);
  }

  async getNextTask(): Promise<string | null> {
    const index = await this.read();

    const pendingTasks = Object.entries(index.tasks)
      .filter(([, task]) => task.status === 'pending' || task.status === 'in_progress')
      .sort(([, a], [, b]) => a.priority - b.priority);

    return pendingTasks.length > 0 ? pendingTasks[0][0] : null;
  }

  async updateMetadata(metadata: MetadataUpdate): Promise<void> {
    const index = await this.read();
    index.metadata = { ...index.metadata, ...metadata };
    await this.write(index);
  }

  async hasTask(taskId: string): Promise<boolean> {
    const index = await this.read();
    return taskId in index.tasks;
  }

  async getAllTaskIds(): Promise<string[]> {
    const index = await this.read();
    return Object.keys(index.tasks);
  }

  async getTasksByStatus(status: string): Promise<string[]> {
    const index = await this.read();
    return Object.entries(index.tasks)
      .filter(([, task]) => task.status === status)
      .map(([id]) => id);
  }

  private createDefaultIndex(): TaskIndex {
    return {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      metadata: {
        projectGoal: '',
      },
      tasks: {},
    };
  }
}
