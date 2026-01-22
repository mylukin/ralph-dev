/**
 * Service Factory Unit Tests
 *
 * Tests the dependency injection container that creates and wires up services.
 * Follows AAA pattern: Arrange-Act-Assert
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import {
  createServices,
  createTaskService,
  createStatusService,
  createStateService,
  createDetectionService,
  createContextService,
  ServiceContainer,
} from '../../src/commands/service-factory';
import { Task } from '../../src/domain/task-entity';

describe('Service Factory', () => {
  let testDir: string;
  let workspaceDir: string;

  beforeEach(async () => {
    // Arrange: Create a temporary workspace directory
    testDir = path.join(os.tmpdir(), `service-factory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    workspaceDir = testDir;
    await fs.ensureDir(testDir);

    // Create .ralph-dev structure
    const ralphDevDir = path.join(testDir, '.ralph-dev');
    const tasksDir = path.join(ralphDevDir, 'tasks');
    await fs.ensureDir(tasksDir);

    // Create minimal state.json
    await fs.writeJson(path.join(ralphDevDir, 'state.json'), {
      phase: 'implement',
      currentTask: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create minimal index.json for tasks
    await fs.writeJson(path.join(tasksDir, 'index.json'), {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      metadata: {},
      tasks: {},
    });
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testDir);
  });

  describe('createServices', () => {
    it('should create a complete service container with all services', () => {
      // Act
      const container = createServices(workspaceDir);

      // Assert
      expect(container).toBeDefined();
      expect(container.taskService).toBeDefined();
      expect(container.stateService).toBeDefined();
      expect(container.statusService).toBeDefined();
      expect(container.detectionService).toBeDefined();
      expect(container.logger).toBeDefined();
    });

    it('should create services with correct workspace directory', async () => {
      // Act
      const container = createServices(workspaceDir);

      // Assert: Verify services can access workspace
      // StateService should be able to get state from the workspace
      const state = await container.stateService.getState();
      expect(state).toBeDefined();
      expect(state?.phase).toBe('implement');
    });

    it('should return services implementing correct interfaces', () => {
      // Act
      const container: ServiceContainer = createServices(workspaceDir);

      // Assert: Verify interface methods exist
      // TaskService
      expect(typeof container.taskService.createTask).toBe('function');
      expect(typeof container.taskService.getTask).toBe('function');
      expect(typeof container.taskService.listTasks).toBe('function');
      expect(typeof container.taskService.getNextTask).toBe('function');
      expect(typeof container.taskService.startTask).toBe('function');
      expect(typeof container.taskService.completeTask).toBe('function');
      expect(typeof container.taskService.failTask).toBe('function');

      // StateService
      expect(typeof container.stateService.getState).toBe('function');
      expect(typeof container.stateService.initializeState).toBe('function');
      expect(typeof container.stateService.updateState).toBe('function');
      expect(typeof container.stateService.clearState).toBe('function');

      // StatusService
      expect(typeof container.statusService.getProjectStatus).toBe('function');

      // DetectionService
      expect(typeof container.detectionService.detect).toBe('function');
      expect(typeof container.detectionService.detectAndSave).toBe('function');

      // Logger
      expect(typeof container.logger.debug).toBe('function');
      expect(typeof container.logger.info).toBe('function');
      expect(typeof container.logger.warn).toBe('function');
      expect(typeof container.logger.error).toBe('function');
    });
  });

  describe('createTaskService', () => {
    it('should create a TaskService instance', () => {
      // Act
      const taskService = createTaskService(workspaceDir);

      // Assert
      expect(taskService).toBeDefined();
      expect(typeof taskService.createTask).toBe('function');
      expect(typeof taskService.getTask).toBe('function');
      expect(typeof taskService.listTasks).toBe('function');
      expect(typeof taskService.getNextTask).toBe('function');
      expect(typeof taskService.startTask).toBe('function');
      expect(typeof taskService.completeTask).toBe('function');
      expect(typeof taskService.failTask).toBe('function');
    });

    it('should create independent task service instances', () => {
      // Act
      const service1 = createTaskService(workspaceDir);
      const service2 = createTaskService(workspaceDir);

      // Assert: Different instances
      expect(service1).not.toBe(service2);
    });

    it('should be able to perform task operations', async () => {
      // Arrange
      const taskService = createTaskService(workspaceDir);

      // Act
      const task = await taskService.createTask({
        id: 'test.task',
        module: 'test',
        priority: 1,
        description: 'Test task',
        estimatedMinutes: 10,
      });

      // Assert
      expect(task).toBeInstanceOf(Task);
      expect(task.id).toBe('test.task');
      expect(task.module).toBe('test');
    });
  });

  describe('createStatusService', () => {
    it('should create a StatusService instance', () => {
      // Act
      const statusService = createStatusService(workspaceDir);

      // Assert
      expect(statusService).toBeDefined();
      expect(typeof statusService.getProjectStatus).toBe('function');
    });

    it('should create independent status service instances', () => {
      // Act
      const service1 = createStatusService(workspaceDir);
      const service2 = createStatusService(workspaceDir);

      // Assert: Different instances
      expect(service1).not.toBe(service2);
    });

    it('should be able to get project status', async () => {
      // Arrange
      const statusService = createStatusService(workspaceDir);

      // Act
      const status = await statusService.getProjectStatus();

      // Assert
      expect(status).toBeDefined();
      expect(status.overall).toBeDefined();
      expect(status.overall.total).toBe(0); // No tasks created yet
      expect(status.currentPhase).toBe('implement');
    });
  });

  describe('createStateService', () => {
    it('should create a StateService instance', () => {
      // Act
      const stateService = createStateService(workspaceDir);

      // Assert
      expect(stateService).toBeDefined();
      expect(typeof stateService.getState).toBe('function');
      expect(typeof stateService.initializeState).toBe('function');
      expect(typeof stateService.updateState).toBe('function');
      expect(typeof stateService.clearState).toBe('function');
      expect(typeof stateService.exists).toBe('function');
      expect(typeof stateService.setCurrentTask).toBe('function');
    });

    it('should create independent state service instances', () => {
      // Act
      const service1 = createStateService(workspaceDir);
      const service2 = createStateService(workspaceDir);

      // Assert: Different instances
      expect(service1).not.toBe(service2);
    });

    it('should be able to get and set state', async () => {
      // Arrange
      const stateService = createStateService(workspaceDir);

      // Act: Get initial state
      const state = await stateService.getState();

      // Assert
      expect(state).toBeDefined();
      expect(state?.phase).toBe('implement');
    });

    it('should be able to update state phase', async () => {
      // Arrange
      const stateService = createStateService(workspaceDir);

      // Act: Use updateState to change phase
      await stateService.updateState({ phase: 'deliver' });
      const state = await stateService.getState();

      // Assert
      expect(state?.phase).toBe('deliver');
    });
  });

  describe('createDetectionService', () => {
    it('should create a DetectionService instance', () => {
      // Act
      const detectionService = createDetectionService(workspaceDir);

      // Assert
      expect(detectionService).toBeDefined();
      expect(typeof detectionService.detect).toBe('function');
      expect(typeof detectionService.detectAndSave).toBe('function');
    });

    it('should create independent detection service instances', () => {
      // Act
      const service1 = createDetectionService(workspaceDir);
      const service2 = createDetectionService(workspaceDir);

      // Assert: Different instances
      expect(service1).not.toBe(service2);
    });

    it('should be able to detect language configuration', async () => {
      // Arrange: Create a package.json to help detection
      await fs.writeJson(path.join(workspaceDir, 'package.json'), {
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          vitest: '^1.0.0',
          typescript: '^5.0.0',
        },
      });

      const detectionService = createDetectionService(workspaceDir);

      // Act
      const config = await detectionService.detect();

      // Assert
      expect(config).toBeDefined();
      expect(config.language).toBeDefined();
    });
  });

  describe('createContextService', () => {
    it('should create a ContextService instance', () => {
      // Act
      const contextService = createContextService(workspaceDir);

      // Assert
      expect(contextService).toBeDefined();
      expect(typeof contextService.gatherTaskContext).toBe('function');
      expect(typeof contextService.getGitInfo).toBe('function');
      expect(typeof contextService.getTaskProgressStats).toBe('function');
    });

    it('should create independent context service instances', () => {
      // Act
      const service1 = createContextService(workspaceDir);
      const service2 = createContextService(workspaceDir);

      // Assert: Different instances
      expect(service1).not.toBe(service2);
    });

    it('should be able to get git info', () => {
      // Arrange
      const contextService = createContextService(workspaceDir);

      // Act
      const gitInfo = contextService.getGitInfo();

      // Assert: gitInfo should be defined (may have error if not a git repo)
      expect(gitInfo).toBeDefined();
    });

    it('should be able to get task progress stats', async () => {
      // Arrange
      const contextService = createContextService(workspaceDir);

      // Act
      const stats = await contextService.getTaskProgressStats();

      // Assert
      expect(stats).toBeDefined();
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('workspace directory handling', () => {
    it('should handle workspace directory with spaces in path', async () => {
      // Arrange: Create workspace with spaces in name
      const spacedDir = path.join(os.tmpdir(), `service factory test ${Date.now()}`);
      await fs.ensureDir(path.join(spacedDir, '.ralph-dev', 'tasks'));
      await fs.writeJson(path.join(spacedDir, '.ralph-dev', 'state.json'), {
        phase: 'clarify',
        currentTask: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await fs.writeJson(path.join(spacedDir, '.ralph-dev', 'tasks', 'index.json'), {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        metadata: {},
        tasks: {},
      });

      try {
        // Act
        const container = createServices(spacedDir);
        const state = await container.stateService.getState();

        // Assert
        expect(state?.phase).toBe('clarify');
      } finally {
        await fs.remove(spacedDir);
      }
    });

    it('should use correct tasks directory path structure', async () => {
      // Arrange
      const taskService = createTaskService(workspaceDir);

      // Act: Create a task
      await taskService.createTask({
        id: 'mymodule.mytask',
        module: 'mymodule',
        priority: 1,
        description: 'Test task for path verification',
        estimatedMinutes: 5,
      });

      // Assert: Task file should exist in module subdirectory
      // Note: Filename is task.id minus module prefix, so "mymodule.mytask" -> "mytask.md"
      const taskFilePath = path.join(workspaceDir, '.ralph-dev', 'tasks', 'mymodule', 'mytask.md');
      const exists = await fs.pathExists(taskFilePath);
      expect(exists).toBe(true);
    });
  });

  describe('service isolation', () => {
    it('should create services that share underlying file state', async () => {
      // Arrange
      const container1 = createServices(workspaceDir);
      const container2 = createServices(workspaceDir);

      // Act: Modify state through first container (use valid transition: implement -> deliver)
      await container1.stateService.updateState({ phase: 'deliver' });

      // Assert: Second container should see the change (file-based)
      const state = await container2.stateService.getState();
      expect(state?.phase).toBe('deliver');
    });

    it('should return independent service instances', () => {
      // Act
      const container1 = createServices(workspaceDir);
      const container2 = createServices(workspaceDir);

      // Assert: Service instances should be different objects
      expect(container1.taskService).not.toBe(container2.taskService);
      expect(container1.stateService).not.toBe(container2.stateService);
      expect(container1.statusService).not.toBe(container2.statusService);
      expect(container1.detectionService).not.toBe(container2.detectionService);
      expect(container1.logger).not.toBe(container2.logger);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent workspace gracefully for getState', async () => {
      // Arrange: Use a non-existent directory
      const nonExistentDir = path.join(os.tmpdir(), `non-existent-${Date.now()}`);
      const stateService = createStateService(nonExistentDir);

      // Act
      const state = await stateService.getState();

      // Assert: Should return null for non-existent state
      expect(state).toBeNull();
    });
  });
});
