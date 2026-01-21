import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextService, IGitExecutor } from '../../src/services/context-service';
import { Task } from '../../src/domain/task-entity';
import { MockTaskRepository, MockStateRepository, MockLogger, MockFileSystem } from '../../src/test-utils';

describe('ContextService', () => {
  let taskRepo: MockTaskRepository;
  let stateRepo: MockStateRepository;
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let gitExecutor: IGitExecutor;
  let service: ContextService;
  const workspaceDir = '/test/workspace';

  beforeEach(() => {
    taskRepo = new MockTaskRepository();
    stateRepo = new MockStateRepository();
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    gitExecutor = {
      exec: vi.fn(),
    };
    service = new ContextService(
      taskRepo,
      stateRepo,
      fileSystem,
      logger,
      workspaceDir,
      gitExecutor
    );
  });

  describe('getGitInfo', () => {
    it('should return branch and last 5 commits', () => {
      // Arrange
      const mockGitLog = [
        'abc1234|Fix authentication bug|2 hours ago',
        'def5678|Add user profile page|5 hours ago',
        'ghi9012|Update dependencies|1 day ago',
        'jkl3456|Refactor database layer|2 days ago',
        'mno7890|Initial commit|3 days ago',
      ].join('\n');

      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return mockGitLog;
        }
        return '';
      });

      // Act
      const result = service.getGitInfo();

      // Assert
      expect(result.branch).toBe('main');
      expect(result.recentCommits).toHaveLength(5);
      expect(result.recentCommits![0]).toEqual({
        hash: 'abc1234',
        message: 'Fix authentication bug',
        time: '2 hours ago',
      });
      expect(result.recentCommits![4]).toEqual({
        hash: 'mno7890',
        message: 'Initial commit',
        time: '3 days ago',
      });
    });

    it('should handle fewer than 5 commits', () => {
      // Arrange
      const mockGitLog = [
        'abc1234|First commit|1 day ago',
        'def5678|Second commit|2 days ago',
      ].join('\n');

      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'feature/new-feature';
        }
        if (cmd.includes('git log')) {
          return mockGitLog;
        }
        return '';
      });

      // Act
      const result = service.getGitInfo();

      // Assert
      expect(result.branch).toBe('feature/new-feature');
      expect(result.recentCommits).toHaveLength(2);
    });

    it('should return error when not in git repository', () => {
      // Arrange
      (gitExecutor.exec as any).mockImplementation(() => {
        throw new Error('fatal: not a git repository');
      });

      // Act
      const result = service.getGitInfo();

      // Assert
      expect(result.error).toBe('Not a git repository or no commits');
      expect(result.branch).toBeUndefined();
      expect(result.recentCommits).toBeUndefined();
    });

    it('should handle empty git log', () => {
      // Arrange
      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return '';
        }
        return '';
      });

      // Act
      const result = service.getGitInfo();

      // Assert
      expect(result.branch).toBe('main');
      expect(result.recentCommits).toHaveLength(1);
      // Empty string split results in array with one empty element
    });
  });

  describe('getTaskProgressStats', () => {
    it('should calculate progress statistics correctly', async () => {
      // Arrange
      await taskRepo.save(
        new Task({
          id: 'task1',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 30,
          description: 'Completed task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      await taskRepo.save(
        new Task({
          id: 'task2',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 30,
          description: 'Another completed task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      await taskRepo.save(
        new Task({
          id: 'task3',
          module: 'test',
          priority: 1,
          status: 'in_progress',
          estimatedMinutes: 30,
          description: 'In progress task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      await taskRepo.save(
        new Task({
          id: 'task4',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Pending task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );
      await taskRepo.save(
        new Task({
          id: 'task5',
          module: 'test',
          priority: 1,
          status: 'failed',
          estimatedMinutes: 30,
          description: 'Failed task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Act
      const stats = await service.getTaskProgressStats();

      // Assert
      expect(stats.total).toBe(5);
      expect(stats.completed).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.percentage).toBe(40); // 2/5 * 100 = 40%
    });

    it('should return 0 percentage when no tasks', async () => {
      // Act
      const stats = await service.getTaskProgressStats();

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });

  describe('gatherTaskContext', () => {
    it('should gather comprehensive context for a task', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: ['dep.task'],
        notes: '',
      });

      // Add dependency task
      await taskRepo.save(
        new Task({
          id: 'dep.task',
          module: 'test',
          priority: 1,
          status: 'completed',
          estimatedMinutes: 30,
          description: 'Dependency task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      // Setup state
      await stateRepo.set({
        phase: 'implement',
        startedAt: new Date().toISOString(),
      });

      // Setup git
      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return 'abc123|Test commit|1 hour ago';
        }
        return '';
      });

      // Setup progress log
      await fileSystem.ensureDir('/test/workspace/.ralph-dev');
      await fileSystem.writeFile(
        '/test/workspace/.ralph-dev/progress.log',
        '[2024-01-01] STARTED: task1\n[2024-01-01] COMPLETED: task1\n'
      );

      // Act
      const context = await service.gatherTaskContext(task);

      // Assert
      expect(context.currentDirectory).toBeDefined();
      expect(context.git.branch).toBe('main');
      expect(context.git.recentCommits).toHaveLength(1);
      expect(context.state).not.toBeNull();
      expect(context.progress.total).toBe(1); // dependency task
      expect(context.dependencyStatus).toHaveLength(1);
      expect(context.dependencyStatus[0].id).toBe('dep.task');
      expect(context.dependencyStatus[0].satisfied).toBe(true);
    });

    it('should handle task with no dependencies', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: [],
        notes: '',
      });

      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return 'abc123|Test commit|1 hour ago';
        }
        return '';
      });

      // Act
      const context = await service.gatherTaskContext(task);

      // Assert
      expect(context.dependencyStatus).toHaveLength(0);
    });

    it('should mark unsatisfied dependencies correctly', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: ['dep.task'],
        notes: '',
      });

      // Add dependency task that is NOT completed
      await taskRepo.save(
        new Task({
          id: 'dep.task',
          module: 'test',
          priority: 1,
          status: 'pending',
          estimatedMinutes: 30,
          description: 'Dependency task',
          acceptanceCriteria: [],
          dependencies: [],
          notes: '',
        })
      );

      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return 'abc123|Test commit|1 hour ago';
        }
        return '';
      });

      // Act
      const context = await service.gatherTaskContext(task);

      // Assert
      expect(context.dependencyStatus[0].satisfied).toBe(false);
      expect(context.dependencyStatus[0].status).toBe('pending');
    });

    it('should handle unknown dependency', async () => {
      // Arrange
      const task = new Task({
        id: 'test.task',
        module: 'test',
        priority: 1,
        status: 'pending',
        estimatedMinutes: 30,
        description: 'Test task',
        acceptanceCriteria: [],
        dependencies: ['nonexistent.task'],
        notes: '',
      });

      (gitExecutor.exec as any).mockImplementation((cmd: string) => {
        if (cmd.includes('branch --show-current')) {
          return 'main';
        }
        if (cmd.includes('git log')) {
          return 'abc123|Test commit|1 hour ago';
        }
        return '';
      });

      // Act
      const context = await service.gatherTaskContext(task);

      // Assert
      expect(context.dependencyStatus[0].id).toBe('nonexistent.task');
      expect(context.dependencyStatus[0].status).toBe('unknown');
      expect(context.dependencyStatus[0].satisfied).toBe(false);
    });
  });
});
