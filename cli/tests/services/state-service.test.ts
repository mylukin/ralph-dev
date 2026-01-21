import { describe, it, expect, beforeEach } from 'vitest';
import { StateService, StateUpdate } from '../../src/services/state-service';
import { State, StateConfig } from '../../src/domain/state-entity';
import { IStateRepository } from '../../src/repositories/state-repository';
import { ILogger } from '../../src/infrastructure/logger';
import { MockFileSystem } from '../../src/test-utils/mock-file-system';

/**
 * Mock StateRepository for testing
 */
class MockStateRepository implements IStateRepository {
  private state: State | null = null;

  async get(): Promise<State | null> {
    return this.state;
  }

  async set(stateConfig: Omit<StateConfig, 'updatedAt'>): Promise<void> {
    this.state = State.fromJSON({
      ...stateConfig,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(updates: StateUpdate): Promise<void> {
    if (!this.state) {
      throw new Error('No state to update');
    }
    if (updates.phase !== undefined) {
      this.state.transitionTo(updates.phase);
    }
    if ('currentTask' in updates) {
      this.state.setCurrentTask(updates.currentTask);
    }
    if (updates.prd !== undefined) {
      this.state.setPrd(updates.prd);
    }
    if (updates.addError !== undefined) {
      this.state.addError(updates.addError);
    }
  }

  async clear(): Promise<void> {
    this.state = null;
  }

  async exists(): Promise<boolean> {
    return this.state !== null;
  }

  // Test helper
  setState(state: State): void {
    this.state = state;
  }
}

/**
 * Mock Logger for testing
 */
class MockLogger implements ILogger {
  logs: Array<{ level: string; message: string; meta?: any }> = [];

  debug(message: string, meta?: any): void {
    this.logs.push({ level: 'debug', message, meta });
  }

  info(message: string, meta?: any): void {
    this.logs.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: any): void {
    this.logs.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: any): void {
    this.logs.push({ level: 'error', message, meta });
  }

  clear(): void {
    this.logs = [];
  }
}

describe('StateService', () => {
  let stateRepo: MockStateRepository;
  let logger: MockLogger;
  let service: StateService;

  beforeEach(() => {
    stateRepo = new MockStateRepository();
    logger = new MockLogger();
    service = new StateService(stateRepo, logger);
  });

  describe('getState', () => {
    it('should return null when state does not exist', async () => {
      // Act
      const result = await service.getState();

      // Assert
      expect(result).toBeNull();
    });

    it('should return state when it exists', async () => {
      // Arrange
      const state = State.createNew();
      stateRepo.setState(state);

      // Act
      const result = await service.getState();

      // Assert
      expect(result).toBeDefined();
      expect(result?.phase).toBe('clarify');
    });
  });

  describe('initializeState', () => {
    it('should create new state in clarify phase by default', async () => {
      // Act
      const result = await service.initializeState();

      // Assert
      expect(result).toBeDefined();
      expect(result.phase).toBe('clarify');
      expect(result.startedAt).toBeDefined();
    });

    it('should create new state in specified phase', async () => {
      // Act
      const result = await service.initializeState('implement');

      // Assert
      expect(result.phase).toBe('implement');
    });

    it('should return existing state if already initialized', async () => {
      // Arrange
      const existing = State.createNew();
      stateRepo.setState(existing);

      // Act
      const result = await service.initializeState('breakdown');

      // Assert
      expect(result.phase).toBe('clarify'); // Original phase, not changed
      expect(logger.logs.some((l) => l.level === 'warn' && l.message.includes('already exists'))).toBe(
        true
      );
    });

    it('should log initialization', async () => {
      // Act
      await service.initializeState('breakdown');

      // Assert
      expect(logger.logs).toContainEqual({
        level: 'info',
        message: 'Initializing workflow state',
        meta: { phase: 'breakdown' },
      });
    });
  });

  describe('updateState', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should update current task', async () => {
      // Arrange
      const updates: StateUpdate = {
        currentTask: 'test.task',
      };

      // Act
      const result = await service.updateState(updates);

      // Assert
      expect(result.currentTask).toBe('test.task');
    });

    it('should update PRD', async () => {
      // Arrange
      const prd = {
        title: 'Test PRD',
        requirements: ['req1', 'req2'],
      };
      const updates: StateUpdate = {
        prd,
      };

      // Act
      const result = await service.updateState(updates);

      // Assert
      expect(result.prd).toEqual(prd);
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();
      const updates: StateUpdate = {
        currentTask: 'test.task',
      };

      // Act & Assert
      await expect(service.updateState(updates)).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('setCurrentTask', () => {
    beforeEach(async () => {
      await service.initializeState();
    });

    it('should set current task', async () => {
      // Act
      const result = await service.setCurrentTask('test.task');

      // Assert
      expect(result.currentTask).toBe('test.task');
    });

    it('should clear current task with undefined', async () => {
      // Arrange
      await service.setCurrentTask('test.task');

      // Act
      const result = await service.setCurrentTask(undefined);

      // Assert
      expect(result.currentTask).toBeUndefined();
    });

    it('should throw error when state does not exist', async () => {
      // Arrange
      await service.clearState();

      // Act & Assert
      await expect(service.setCurrentTask('test.task')).rejects.toThrow(
        'State not found. Initialize state first.'
      );
    });
  });

  describe('clearState', () => {
    it('should clear state', async () => {
      // Arrange
      await service.initializeState();

      // Act
      await service.clearState();

      // Assert
      const result = await service.getState();
      expect(result).toBeNull();
    });

    it('should not throw error when clearing non-existent state', async () => {
      // Act & Assert
      await expect(service.clearState()).resolves.not.toThrow();
    });

    it('should log clear operation', async () => {
      // Act
      await service.clearState();

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Clearing'))).toBe(
        true
      );
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('cleared'))).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return false when state does not exist', async () => {
      // Act
      const result = await service.exists();

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when state exists', async () => {
      // Arrange
      await service.initializeState();

      // Act
      const result = await service.exists();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('archiveSession', () => {
    let mockFileSystem: MockFileSystem;
    let serviceWithFileSystem: StateService;
    const workspaceDir = '/test/workspace';

    beforeEach(() => {
      mockFileSystem = new MockFileSystem();
      stateRepo = new MockStateRepository();
      logger = new MockLogger();
      serviceWithFileSystem = new StateService(stateRepo, logger, mockFileSystem, workspaceDir);
    });

    it('should throw error when fileSystem is not provided', async () => {
      // Act & Assert
      await expect(service.archiveSession()).rejects.toThrow(
        'FileSystem and workspaceDir are required for archiveSession'
      );
    });

    it('should return archived: false when no session data exists', async () => {
      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(false);
      expect(result.archivePath).toBeNull();
      expect(result.files).toEqual([]);
    });

    it('should archive state.json when it exists (with force)', async () => {
      // Arrange
      const state = State.createNew();
      stateRepo.setState(state);
      // Also create the file in mock file system
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act - use force since clarify is incomplete
      const result = await serviceWithFileSystem.archiveSession({ force: true });

      // Assert
      expect(result.archived).toBe(true);
      expect(result.archivePath).toContain('.ralph-dev/archive/');
      expect(result.files).toContain('state.json');
    });

    it('should archive prd.md when it exists', async () => {
      // Arrange
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/prd.md`, '# Test PRD');

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(true);
      expect(result.files).toContain('prd.md');
      // Verify original file is removed
      expect(await mockFileSystem.exists(`${workspaceDir}/.ralph-dev/prd.md`)).toBe(false);
    });

    it('should archive tasks directory when it exists', async () => {
      // Arrange
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/tasks/index.json`, '{}');
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/tasks/auth/login.md`, '# Task');

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(true);
      expect(result.files).toContain('tasks');
      // Verify original directory is removed
      expect(await mockFileSystem.exists(`${workspaceDir}/.ralph-dev/tasks`)).toBe(false);
    });

    it('should archive progress.log and debug.log when they exist', async () => {
      // Arrange
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/progress.log`, 'log content');
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/debug.log`, 'debug content');
      const state = State.createNew();
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act - use force since clarify is incomplete
      const result = await serviceWithFileSystem.archiveSession({ force: true });

      // Assert
      expect(result.files).toContain('state.json');
      expect(result.files).toContain('progress.log');
      expect(result.files).toContain('debug.log');
      // Verify originals are removed
      expect(await mockFileSystem.exists(`${workspaceDir}/.ralph-dev/progress.log`)).toBe(false);
      expect(await mockFileSystem.exists(`${workspaceDir}/.ralph-dev/debug.log`)).toBe(false);
    });

    it('should archive all session files to timestamped directory', async () => {
      // Arrange
      const state = State.createNew();
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/prd.md`, '# PRD');
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/tasks/index.json`, '{}');

      // Act - use force since clarify is incomplete
      const result = await serviceWithFileSystem.archiveSession({ force: true });

      // Assert
      expect(result.archived).toBe(true);
      expect(result.archivePath).toMatch(/\.ralph-dev\/archive\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
      expect(result.files).toContain('state.json');
      expect(result.files).toContain('prd.md');
      expect(result.files).toContain('tasks');

      // Verify files are copied to archive
      expect(await mockFileSystem.exists(`${result.archivePath}/state.json`)).toBe(true);
      expect(await mockFileSystem.exists(`${result.archivePath}/prd.md`)).toBe(true);
      expect(await mockFileSystem.exists(`${result.archivePath}/tasks/index.json`)).toBe(true);
    });

    it('should clear state after archiving', async () => {
      // Arrange
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      state.transitionTo('deliver');
      state.transitionTo('complete'); // complete phase doesn't need --force
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      await serviceWithFileSystem.archiveSession();

      // Assert
      expect(await stateRepo.exists()).toBe(false);
    });

    it('should log archive operation', async () => {
      // Arrange
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      state.transitionTo('deliver');
      state.transitionTo('complete'); // must go through all phases
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      await serviceWithFileSystem.archiveSession();

      // Assert
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('Archiving'))).toBe(true);
      expect(logger.logs.some((l) => l.level === 'info' && l.message.includes('archived'))).toBe(true);
    });

    it('should block archiving incomplete sessions without --force', async () => {
      // Arrange - session in implement phase (incomplete)
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedReason).toContain('implement');
      expect(result.blockedReason).toContain('--force');
      expect(result.currentPhase).toBe('implement');
      // State should NOT be cleared
      expect(await stateRepo.exists()).toBe(true);
    });

    it('should allow archiving incomplete sessions with --force', async () => {
      // Arrange - session in implement phase (incomplete)
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act - use force option
      const result = await serviceWithFileSystem.archiveSession({ force: true });

      // Assert
      expect(result.archived).toBe(true);
      expect(result.blocked).toBeUndefined();
      expect(result.archivePath).toContain('.ralph-dev/archive/');
      expect(result.files).toContain('state.json');
      // State should be cleared
      expect(await stateRepo.exists()).toBe(false);
    });

    it('should allow archiving complete sessions without --force', async () => {
      // Arrange - session in complete phase
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      state.transitionTo('deliver');
      state.transitionTo('complete');
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act - no force option
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(true);
      expect(result.blocked).toBeUndefined();
    });

    it('should block archiving clarify phase without --force', async () => {
      // Arrange - fresh session in clarify phase
      const state = State.createNew(); // starts in clarify
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.currentPhase).toBe('clarify');
    });

    it('should block archiving breakdown phase without --force', async () => {
      // Arrange
      const state = State.createNew();
      state.transitionTo('breakdown');
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.currentPhase).toBe('breakdown');
    });

    it('should block archiving deliver phase without --force', async () => {
      // Arrange
      const state = State.createNew();
      state.transitionTo('breakdown');
      state.transitionTo('implement');
      state.transitionTo('deliver');
      stateRepo.setState(state);
      mockFileSystem.setFile(`${workspaceDir}/.ralph-dev/state.json`, JSON.stringify(state.toJSON()));

      // Act
      const result = await serviceWithFileSystem.archiveSession();

      // Assert
      expect(result.archived).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.currentPhase).toBe('deliver');
    });
  });
});
