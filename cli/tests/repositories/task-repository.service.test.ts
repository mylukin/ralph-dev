import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemTaskRepository } from '../../src/repositories/task-repository.service';
import { MockFileSystem } from '../../src/test-utils/mock-file-system';
import { Task } from '../../src/core/task-parser';
import * as path from 'path';

describe('FileSystemTaskRepository', () => {
  let repository: FileSystemTaskRepository;
  let mockFs: MockFileSystem;
  const tasksDir = '/test-workspace/.ralph-dev/tasks';

  beforeEach(() => {
    mockFs = new MockFileSystem();
    repository = new FileSystemTaskRepository(mockFs, tasksDir);
  });

  afterEach(() => {
    mockFs.reset();
  });

  describe('findById', () => {
    it('should return null when task does not exist', async () => {
      // Arrange: Empty file system

      // Act
      const task = await repository.findById('nonexistent.task');

      // Assert
      expect(task).toBeNull();
    });

    it('should return task when found in file system', async () => {
      // Arrange: Create task file
      const taskContent = `---
id: auth.login
module: auth
priority: 1
status: pending
estimatedMinutes: 30
dependencies:
  - setup.scaffold
---

# Create login API endpoint

## Acceptance Criteria
1. API endpoint accepts username and password
2. Returns JWT token on success
3. Returns 401 on invalid credentials

## Notes
Use bcrypt for password hashing.
`;
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      mockFs.setFile(taskFilePath, taskContent);

      // Create index.json
      const indexPath = path.join(tasksDir, 'index.json');
      mockFs.setFile(
        indexPath,
        JSON.stringify({
          version: '1.0.0',
          updatedAt: '2026-01-20T00:00:00Z',
          metadata: { projectGoal: 'Build auth system' },
          tasks: {
            'auth.login': {
              status: 'pending',
              priority: 1,
              module: 'auth',
              description: 'Create login API endpoint',
              filePath: 'auth/login.md',
            },
          },
        })
      );

      // Act
      const task = await repository.findById('auth.login');

      // Assert
      expect(task).not.toBeNull();
      expect(task?.id).toBe('auth.login');
      expect(task?.module).toBe('auth');
      expect(task?.priority).toBe(1);
      expect(task?.status).toBe('pending');
      expect(task?.description).toBe('Create login API endpoint');
      expect(task?.acceptanceCriteria).toHaveLength(3);
      expect(task?.dependencies).toEqual(['setup.scaffold']);
      expect(task?.notes).toContain('bcrypt');
    });

    it('should return null when task is in index but file does not exist', async () => {
      // Arrange: Create index.json without task file
      const indexPath = path.join(tasksDir, 'index.json');
      mockFs.setFile(
        indexPath,
        JSON.stringify({
          version: '1.0.0',
          updatedAt: '2026-01-20T00:00:00Z',
          metadata: { projectGoal: 'Test' },
          tasks: {
            'auth.login': {
              status: 'pending',
              priority: 1,
              module: 'auth',
              description: 'Test task',
              filePath: 'auth/login.md',
            },
          },
        })
      );

      // Act
      const task = await repository.findById('auth.login');

      // Assert
      expect(task).toBeNull();
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Arrange: Create multiple tasks
      const tasks = [
        {
          id: 'auth.login',
          module: 'auth',
          priority: 1,
          status: 'pending',
          content: `---
id: auth.login
module: auth
priority: 1
status: pending
---

# Login task

## Acceptance Criteria
1. Criterion 1
`,
        },
        {
          id: 'auth.logout',
          module: 'auth',
          priority: 2,
          status: 'in_progress',
          content: `---
id: auth.logout
module: auth
priority: 2
status: in_progress
---

# Logout task

## Acceptance Criteria
1. Criterion 1
`,
        },
        {
          id: 'user.profile',
          module: 'user',
          priority: 3,
          status: 'completed',
          content: `---
id: user.profile
module: user
priority: 3
status: completed
---

# Profile task

## Acceptance Criteria
1. Criterion 1
`,
        },
      ];

      // Create task files
      for (const task of tasks) {
        const fileName = task.id.replace(`${task.module}.`, '') + '.md';
        const filePath = path.join(tasksDir, task.module, fileName);
        mockFs.setFile(filePath, task.content);
      }

      // Create index.json
      const indexPath = path.join(tasksDir, 'index.json');
      mockFs.setFile(
        indexPath,
        JSON.stringify({
          version: '1.0.0',
          updatedAt: '2026-01-20T00:00:00Z',
          metadata: { projectGoal: 'Test' },
          tasks: {
            'auth.login': {
              status: 'pending',
              priority: 1,
              module: 'auth',
              description: 'Login task',
              filePath: 'auth/login.md',
            },
            'auth.logout': {
              status: 'in_progress',
              priority: 2,
              module: 'auth',
              description: 'Logout task',
              filePath: 'auth/logout.md',
            },
            'user.profile': {
              status: 'completed',
              priority: 3,
              module: 'user',
              description: 'Profile task',
              filePath: 'user/profile.md',
            },
          },
        })
      );
    });

    it('should return all tasks when no filter is provided', async () => {
      // Act
      const tasks = await repository.findAll();

      // Assert
      expect(tasks).toHaveLength(3);
      expect(tasks.map(t => t.id)).toContain('auth.login');
      expect(tasks.map(t => t.id)).toContain('auth.logout');
      expect(tasks.map(t => t.id)).toContain('user.profile');
    });

    it('should filter tasks by status', async () => {
      // Act
      const tasks = await repository.findAll({ status: 'pending' });

      // Assert
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('auth.login');
      expect(tasks[0].status).toBe('pending');
    });

    it('should filter tasks by module', async () => {
      // Act
      const tasks = await repository.findAll({ module: 'auth' });

      // Assert
      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain('auth.login');
      expect(tasks.map(t => t.id)).toContain('auth.logout');
    });

    it('should filter tasks by priority', async () => {
      // Act
      const tasks = await repository.findAll({ priority: 1 });

      // Assert
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('auth.login');
      expect(tasks[0].priority).toBe(1);
    });

    it('should filter tasks by multiple criteria', async () => {
      // Act
      const tasks = await repository.findAll({
        module: 'auth',
        status: 'in_progress',
      });

      // Assert
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('auth.logout');
    });

    it('should return empty array when no tasks match filter', async () => {
      // Act
      const tasks = await repository.findAll({ status: 'failed' });

      // Assert
      expect(tasks).toHaveLength(0);
    });

    it('should return empty array when index does not exist', async () => {
      // Arrange: Reset file system
      mockFs.reset();

      // Act
      const tasks = await repository.findAll();

      // Assert
      expect(tasks).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('should create new task file and update index', async () => {
      // Arrange
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        dependencies: ['setup.scaffold'],
        description: 'Create login endpoint',
        acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
        notes: 'Important notes',
      };

      // Act
      await repository.save(task);

      // Assert: Check task file was created
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      expect(mockFs.hasFile(taskFilePath)).toBe(true);

      const fileContent = (await mockFs.readFile(taskFilePath, 'utf-8')) as string;
      expect(fileContent).toContain('id: auth.login');
      expect(fileContent).toContain('module: auth');
      expect(fileContent).toContain('priority: 1');
      expect(fileContent).toContain('status: pending');
      expect(fileContent).toContain('# Create login endpoint');
      expect(fileContent).toContain('1. Criterion 1');
      expect(fileContent).toContain('2. Criterion 2');
      expect(fileContent).toContain('Important notes');

      // Assert: Check index was updated
      const indexPath = path.join(tasksDir, 'index.json');
      expect(mockFs.hasFile(indexPath)).toBe(true);

      const indexContent = (await mockFs.readFile(indexPath, 'utf-8')) as string;
      const index = JSON.parse(indexContent);
      expect(index.tasks['auth.login']).toBeDefined();
      expect(index.tasks['auth.login'].status).toBe('pending');
      expect(index.tasks['auth.login'].priority).toBe(1);
      expect(index.tasks['auth.login'].module).toBe('auth');
      expect(index.tasks['auth.login'].description).toBe('Create login endpoint');
    });

    it('should update existing task file and index', async () => {
      // Arrange: Create initial task
      const initialTask: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Initial description',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(initialTask);

      // Act: Update task
      const updatedTask: Task = {
        ...initialTask,
        status: 'in_progress',
        priority: 2,
        description: 'Updated description',
      };
      await repository.save(updatedTask);

      // Assert: Check updated content
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      const fileContent = (await mockFs.readFile(taskFilePath, 'utf-8')) as string;
      expect(fileContent).toContain('status: in_progress');
      expect(fileContent).toContain('priority: 2');
      expect(fileContent).toContain('# Updated description');

      // Assert: Check index was updated
      const indexPath = path.join(tasksDir, 'index.json');
      const indexContent = (await mockFs.readFile(indexPath, 'utf-8')) as string;
      const index = JSON.parse(indexContent);
      expect(index.tasks['auth.login'].status).toBe('in_progress');
      expect(index.tasks['auth.login'].priority).toBe(2);
      expect(index.tasks['auth.login'].description).toBe('Updated description');
    });

    it('should preserve existing tasks in index when saving new task', async () => {
      // Arrange: Create first task
      const task1: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login task',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(task1);

      // Act: Create second task
      const task2: Task = {
        id: 'auth.logout',
        module: 'auth',
        priority: 2,
        status: 'pending',
        description: 'Logout task',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(task2);

      // Assert: Both tasks should be in index
      const indexPath = path.join(tasksDir, 'index.json');
      const indexContent = (await mockFs.readFile(indexPath, 'utf-8')) as string;
      const index = JSON.parse(indexContent);
      expect(index.tasks['auth.login']).toBeDefined();
      expect(index.tasks['auth.logout']).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete task file and remove from index', async () => {
      // Arrange: Create a task
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login task',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(task);

      // Act
      await repository.delete('auth.login');

      // Assert: Task file should be deleted
      const taskFilePath = path.join(tasksDir, 'auth', 'login.md');
      expect(mockFs.hasFile(taskFilePath)).toBe(false);

      // Assert: Task should be removed from index
      const indexPath = path.join(tasksDir, 'index.json');
      const indexContent = (await mockFs.readFile(indexPath, 'utf-8')) as string;
      const index = JSON.parse(indexContent);
      expect(index.tasks['auth.login']).toBeUndefined();
    });

    it('should handle deleting non-existent task gracefully', async () => {
      // Act & Assert: Should not throw error
      await expect(repository.delete('nonexistent.task')).resolves.not.toThrow();
    });

    it('should preserve other tasks when deleting one task', async () => {
      // Arrange: Create two tasks
      const task1: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Login task',
        acceptanceCriteria: ['Criterion 1'],
      };
      const task2: Task = {
        id: 'auth.logout',
        module: 'auth',
        priority: 2,
        status: 'pending',
        description: 'Logout task',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(task1);
      await repository.save(task2);

      // Act: Delete first task
      await repository.delete('auth.login');

      // Assert: Second task should still exist
      const indexPath = path.join(tasksDir, 'index.json');
      const indexContent = (await mockFs.readFile(indexPath, 'utf-8')) as string;
      const index = JSON.parse(indexContent);
      expect(index.tasks['auth.login']).toBeUndefined();
      expect(index.tasks['auth.logout']).toBeDefined();
    });
  });

  describe('findNext', () => {
    it('should return null when no pending tasks exist', async () => {
      // Arrange: Empty file system

      // Act
      const task = await repository.findNext();

      // Assert
      expect(task).toBeNull();
    });

    it('should return highest priority pending task', async () => {
      // Arrange: Create tasks with different priorities
      const tasks: Task[] = [
        {
          id: 'auth.login',
          module: 'auth',
          priority: 2,
          status: 'pending',
          description: 'Login task',
          acceptanceCriteria: ['Criterion 1'],
        },
        {
          id: 'auth.logout',
          module: 'auth',
          priority: 1,
          status: 'pending',
          description: 'Logout task (highest priority)',
          acceptanceCriteria: ['Criterion 1'],
        },
        {
          id: 'user.profile',
          module: 'user',
          priority: 3,
          status: 'pending',
          description: 'Profile task',
          acceptanceCriteria: ['Criterion 1'],
        },
      ];

      for (const task of tasks) {
        await repository.save(task);
      }

      // Act
      const nextTask = await repository.findNext();

      // Assert: Should return priority 1 task
      expect(nextTask).not.toBeNull();
      expect(nextTask?.id).toBe('auth.logout');
      expect(nextTask?.priority).toBe(1);
    });

    it('should skip completed tasks', async () => {
      // Arrange: Create completed and pending tasks
      const tasks: Task[] = [
        {
          id: 'auth.login',
          module: 'auth',
          priority: 1,
          status: 'completed',
          description: 'Login task (completed)',
          acceptanceCriteria: ['Criterion 1'],
        },
        {
          id: 'auth.logout',
          module: 'auth',
          priority: 2,
          status: 'pending',
          description: 'Logout task',
          acceptanceCriteria: ['Criterion 1'],
        },
      ];

      for (const task of tasks) {
        await repository.save(task);
      }

      // Act
      const nextTask = await repository.findNext();

      // Assert: Should skip completed task
      expect(nextTask).not.toBeNull();
      expect(nextTask?.id).toBe('auth.logout');
    });

    it('should include in_progress tasks', async () => {
      // Arrange: Create in_progress task
      const task: Task = {
        id: 'auth.login',
        module: 'auth',
        priority: 1,
        status: 'in_progress',
        description: 'Login task',
        acceptanceCriteria: ['Criterion 1'],
      };
      await repository.save(task);

      // Act
      const nextTask = await repository.findNext();

      // Assert: Should return in_progress task
      expect(nextTask).not.toBeNull();
      expect(nextTask?.id).toBe('auth.login');
    });
  });

  describe('enriched body preservation', () => {
    const enrichedContent = `---
id: auth.middleware
module: auth
priority: 2
status: pending
estimatedMinutes: 25
---

# Auth middleware

## 目标 / Context
Protect routes with a JWT guard.

## 接口 / 契约
\`requireAuth(req, res, next)\` → 401 when token missing/invalid.

## TDD
- rejects missing Authorization header
- rejects expired token

## 完成定义 DoD
- all guard tests green

## Acceptance Criteria
1. Valid token passes through
2. Invalid token returns 401
`;

    function seedEnriched(): void {
      const taskFilePath = path.join(tasksDir, 'auth', 'middleware.md');
      mockFs.setFile(taskFilePath, enrichedContent);
      mockFs.setFile(
        path.join(tasksDir, 'index.json'),
        JSON.stringify({
          version: '1.0.0',
          updatedAt: '2026-01-20T00:00:00Z',
          metadata: { projectGoal: 'Build auth system' },
          tasks: {
            'auth.middleware': {
              status: 'pending',
              priority: 2,
              module: 'auth',
              description: 'Auth middleware',
              filePath: 'auth/middleware.md',
            },
          },
        })
      );
    }

    it('parses the full body verbatim into task.body', async () => {
      seedEnriched();

      const task = await repository.findById('auth.middleware');

      expect(task).not.toBeNull();
      expect(task?.body).toContain('## 接口 / 契约');
      expect(task?.body).toContain('## TDD');
      expect(task?.body).toContain('## 完成定义 DoD');
    });

    it('preserves custom sections across a status change', async () => {
      seedEnriched();

      // Read → transition → save (the exact lifecycle that used to wipe sections)
      const task = await repository.findById('auth.middleware');
      task!.start();
      await repository.save(task!);

      const taskFilePath = path.join(tasksDir, 'auth', 'middleware.md');
      const fileContent = (await mockFs.readFile(taskFilePath, 'utf-8')) as string;

      // Frontmatter was regenerated with the new status …
      expect(fileContent).toContain('status: in_progress');
      // … but every enriched section survived verbatim.
      expect(fileContent).toContain('## 目标 / Context');
      expect(fileContent).toContain('## 接口 / 契约');
      expect(fileContent).toContain('requireAuth(req, res, next)');
      expect(fileContent).toContain('## TDD');
      expect(fileContent).toContain('## 完成定义 DoD');
    });

    it('round-trips an enriched body without drift', async () => {
      seedEnriched();

      const first = await repository.findById('auth.middleware');
      await repository.save(first!);
      const after = await repository.findById('auth.middleware');

      expect(after?.body).toBe(first?.body);
    });

    it('stores a body provided at creation verbatim', async () => {
      const task: Task = {
        id: 'auth.session',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Session store',
        acceptanceCriteria: ['Criterion 1'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: '# Session store\n\n## 接口 / 契约\ncreateSession(userId): string\n',
      } as any;

      await repository.save(task);

      const fileContent = (await mockFs.readFile(
        path.join(tasksDir, 'auth', 'session.md'),
        'utf-8'
      )) as string;
      expect(fileContent).toContain('## 接口 / 契约');
      expect(fileContent).toContain('createSession(userId): string');
    });

    it('falls back to field-generated body when no body is provided', async () => {
      const task: Task = {
        id: 'auth.logout',
        module: 'auth',
        priority: 1,
        status: 'pending',
        description: 'Logout endpoint',
        acceptanceCriteria: ['Clears the session'],
      };

      await repository.save(task);

      const fileContent = (await mockFs.readFile(
        path.join(tasksDir, 'auth', 'logout.md'),
        'utf-8'
      )) as string;
      expect(fileContent).toContain('# Logout endpoint');
      expect(fileContent).toContain('## Acceptance Criteria');
      expect(fileContent).toContain('1. Clears the session');
    });
  });

  describe('getFilePath', () => {
    it('resolves the absolute path of an indexed task', async () => {
      mockFs.setFile(
        path.join(tasksDir, 'index.json'),
        JSON.stringify({
          version: '1.0.0',
          updatedAt: '2026-01-20T00:00:00Z',
          metadata: { projectGoal: 'g' },
          tasks: {
            'auth.login': {
              status: 'pending',
              priority: 1,
              module: 'auth',
              description: 'Login',
              filePath: 'auth/login.md',
            },
          },
        })
      );

      const filePath = await repository.getFilePath('auth.login');

      expect(filePath).not.toBeNull();
      expect(path.isAbsolute(filePath as string)).toBe(true);
      expect(filePath).toContain(path.join('auth', 'login.md'));
    });

    it('returns null for an unknown task', async () => {
      expect(await repository.getFilePath('nope.task')).toBeNull();
    });
  });
});
