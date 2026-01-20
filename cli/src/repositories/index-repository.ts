/**
 * Index Repository Interface
 *
 * Provides abstraction for task index persistence operations.
 * The index maintains metadata and task list for fast lookups.
 */

export interface TaskIndex {
  version: string;
  updatedAt: string;
  metadata: {
    projectGoal: string;
    languageConfig?: any;
  };
  tasks: Record<
    string,
    {
      status: string;
      priority: number;
      module: string;
      description: string;
      filePath?: string;
      dependencies?: string[];
      estimatedMinutes?: number;
    }
  >;
}

export interface TaskIndexEntry {
  status: string;
  priority: number;
  module: string;
  description: string;
  filePath?: string;
  dependencies?: string[];
  estimatedMinutes?: number;
}

export interface MetadataUpdate {
  projectGoal?: string;
  languageConfig?: any;
}

/**
 * Index repository interface
 *
 * Manages the task index in .ralph-dev/tasks/index.json
 */
export interface IIndexRepository {
  /**
   * Read the entire index
   * @returns Task index (creates default if not exists)
   */
  read(): Promise<TaskIndex>;

  /**
   * Write the entire index
   * @param index Task index to write
   */
  write(index: TaskIndex): Promise<void>;

  /**
   * Add or update a task entry in the index
   * @param taskId Task ID
   * @param entry Task index entry
   */
  upsertTask(taskId: string, entry: TaskIndexEntry): Promise<void>;

  /**
   * Update task status in the index
   * @param taskId Task ID
   * @param status New status
   */
  updateTaskStatus(taskId: string, status: string): Promise<void>;

  /**
   * Get task file path from index
   * @param taskId Task ID
   * @returns Absolute file path or null if not found
   */
  getTaskFilePath(taskId: string): string | null;

  /**
   * Get next pending/in_progress task (highest priority)
   * @returns Task ID or null if no pending tasks
   */
  getNextTask(): Promise<string | null>;

  /**
   * Update metadata
   * @param metadata Partial metadata update
   */
  updateMetadata(metadata: MetadataUpdate): Promise<void>;

  /**
   * Check if task exists in index
   * @param taskId Task ID
   */
  hasTask(taskId: string): Promise<boolean>;

  /**
   * Get all task IDs
   */
  getAllTaskIds(): Promise<string[]>;

  /**
   * Get tasks by status
   * @param status Task status
   */
  getTasksByStatus(status: string): Promise<string[]>;
}
