/**
 * FileSystemService Usage Examples
 *
 * This file demonstrates how to use the FileSystemService for
 * resilient file system operations with automatic retry logic.
 */

import { FileSystemService } from './file-system.service';
import * as path from 'path';

async function examples() {
  // Create a new FileSystemService instance
  const fileSystem = new FileSystemService();

  // Example 1: Read a file
  // ----------------------
  // Automatically retries on EBUSY, ENOENT, EAGAIN, ETIMEDOUT errors
  const content = await fileSystem.readFile('/path/to/file.txt');
  console.log('File content:', content);

  // Read with specific encoding
  const asciiContent = await fileSystem.readFile('/path/to/file.txt', 'ascii');

  // Example 2: Write a file
  // ----------------------
  // Automatically retries on transient errors
  await fileSystem.writeFile('/path/to/output.txt', 'Hello, World!');

  // Write with options
  await fileSystem.writeFile('/path/to/output.txt', 'Hello, World!', {
    encoding: 'utf-8',
    mode: 0o644,
  });

  // Write buffer data
  const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
  await fileSystem.writeFile('/path/to/binary.bin', buffer);

  // Example 3: Check if path exists
  // -------------------------------
  const exists = await fileSystem.exists('/path/to/file.txt');
  if (exists) {
    console.log('File exists');
  } else {
    console.log('File does not exist');
  }

  // Example 4: Create directories
  // -----------------------------
  // Creates directory and all parent directories if needed
  await fileSystem.ensureDir('/path/to/nested/directory');

  // Example 5: Remove files or directories
  // --------------------------------------
  // Removes files or directories recursively
  await fileSystem.remove('/path/to/file.txt');
  await fileSystem.remove('/path/to/directory'); // Removes directory and all contents

  // Example 6: Read directory contents
  // ----------------------------------
  const files = await fileSystem.readdir('/path/to/directory');
  console.log('Directory contents:', files);

  // Example 7: Common use case - Task file management
  // -------------------------------------------------
  const tasksDir = path.join(process.cwd(), '.ralph-dev', 'tasks');
  const taskModule = 'auth';
  const taskId = 'login';

  // Ensure task module directory exists
  const modulePath = path.join(tasksDir, taskModule);
  await fileSystem.ensureDir(modulePath);

  // Write task file
  const taskFilePath = path.join(modulePath, `${taskId}.md`);
  const taskContent = `---
id: ${taskModule}.${taskId}
module: ${taskModule}
status: pending
---

# Task Description
Implement user login functionality
`;
  await fileSystem.writeFile(taskFilePath, taskContent);

  // Read task file
  const taskFileContent = await fileSystem.readFile(taskFilePath);
  console.log('Task file content:', taskFileContent);

  // Check if task file exists
  const taskExists = await fileSystem.exists(taskFilePath);
  console.log('Task exists:', taskExists);

  // List all task files in module
  const taskFiles = await fileSystem.readdir(modulePath);
  console.log('Task files:', taskFiles);

  // Example 8: Error handling
  // -------------------------
  try {
    // Will retry automatically on EBUSY, ENOENT, EAGAIN, ETIMEDOUT
    await fileSystem.readFile('/path/to/potentially-busy-file.txt');
  } catch (error) {
    // Error thrown after all retries exhausted or if error is not retryable
    console.error('Failed to read file:', error);
  }

  // Example 9: Dependency Injection for Testing
  // -------------------------------------------
  // In production code, inject IFileSystem for testability
  class TaskRepository {
    constructor(private fileSystem: FileSystemService) {}

    async saveTask(taskId: string, content: string): Promise<void> {
      const filePath = path.join('.ralph-dev', 'tasks', `${taskId}.md`);
      await this.fileSystem.writeFile(filePath, content);
    }

    async loadTask(taskId: string): Promise<string> {
      const filePath = path.join('.ralph-dev', 'tasks', `${taskId}.md`);
      return (await this.fileSystem.readFile(filePath)) as string;
    }

    async taskExists(taskId: string): Promise<boolean> {
      const filePath = path.join('.ralph-dev', 'tasks', `${taskId}.md`);
      return await this.fileSystem.exists(filePath);
    }
  }

  // Create repository with file system service
  const taskRepo = new TaskRepository(fileSystem);
  await taskRepo.saveTask('auth.login', taskContent);
  const loadedContent = await taskRepo.loadTask('auth.login');
  console.log('Loaded task:', loadedContent);
}

// Note: This file is for documentation purposes only.
// Don't run it directly - it's just to show usage patterns.
export { examples };
