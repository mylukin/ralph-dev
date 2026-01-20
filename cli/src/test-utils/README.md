# Test Utils - Mock Factories and Test Data

This directory contains mock implementations of infrastructure services and test data fixtures for use in unit tests.

> 此目录包含基础设施服务的模拟实现和用于单元测试的测试数据fixture。

## Overview

The test utilities provide:
- **Mock implementations** of `IFileSystem` and `ILogger` interfaces
- **Test data fixtures** for common domain objects (Tasks, States, LanguageConfigs)
- **Helper methods** for easy test setup and assertions

> 测试工具提供：
> - `IFileSystem` 和 `ILogger` 接口的**模拟实现**
> - 常见领域对象（任务、状态、语言配置）的**测试数据fixture**
> - 用于简化测试设置和断言的**辅助方法**

## Quick Start

```typescript
import {
  MockFileSystem,
  MockLogger,
  testTasks,
  testStates,
} from '../test-utils';

describe('MyService', () => {
  let mockFs: MockFileSystem;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    mockLogger = new MockLogger();
  });

  afterEach(() => {
    mockFs.reset();
    mockLogger.reset();
  });

  it('should do something', async () => {
    // Use the mocks in your tests
    await mockFs.writeFile('/test/file.txt', 'content');
    mockLogger.info('Operation started');

    // Verify behavior
    expect(mockFs.hasFile('/test/file.txt')).toBe(true);
    expect(mockLogger.wasInfoCalled()).toBe(true);
  });
});
```

## MockFileSystem

In-memory file system implementation for testing without touching the real file system.

> 用于测试的内存文件系统实现，不接触真实文件系统。

### Basic Usage

```typescript
const mockFs = new MockFileSystem();

// Write file
await mockFs.writeFile('/test/file.txt', 'Hello, World!');

// Read file
const content = await mockFs.readFile('/test/file.txt', 'utf-8');
expect(content).toBe('Hello, World!');

// Check existence
expect(await mockFs.exists('/test/file.txt')).toBe(true);

// Create directories
await mockFs.ensureDir('/deep/nested/dir');

// List directory
const files = await mockFs.readdir('/test');
expect(files).toContain('file.txt');

// Remove files/directories
await mockFs.remove('/test/file.txt');
```

### Helper Methods

```typescript
// Reset to empty state
mockFs.reset();

// Directly set file (bypassing directory checks)
mockFs.setFile('/test/file.txt', 'content');

// Synchronous checks
expect(mockFs.hasFile('/test/file.txt')).toBe(true);
expect(mockFs.hasDirectory('/test')).toBe(true);

// Get all files and directories
const allFiles = mockFs.getAllFiles();
const allDirs = mockFs.getAllDirectories();
```

### Example: Testing File Operations

```typescript
import { MockFileSystem } from '../test-utils';
import { TaskWriter } from '../core/task-writer';

describe('TaskWriter', () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
  });

  it('should write task file with correct structure', async () => {
    // Arrange
    const task = {
      id: 'test.task',
      module: 'test',
      priority: 1,
      status: 'pending',
      description: 'Test task',
      acceptanceCriteria: ['Criterion 1'],
    };

    // Act
    const writer = new TaskWriter(mockFs);
    await writer.writeTask('/tasks', task);

    // Assert
    expect(mockFs.hasFile('/tasks/test/test.task.md')).toBe(true);
    const content = await mockFs.readFile('/tasks/test/test.task.md', 'utf-8');
    expect(content).toContain('id: test.task');
    expect(content).toContain('# Test task');
  });
});
```

## MockLogger

Mock logger that records all log calls without writing to console or files.

> 模拟日志记录器，记录所有日志调用而不写入控制台或文件。

### Basic Usage

```typescript
const mockLogger = new MockLogger();

// Log messages
mockLogger.debug('Debug message', { key: 'value' });
mockLogger.info('Info message');
mockLogger.warn('Warning message');
mockLogger.error('Error message', new Error('Something went wrong'));

// Verify logging
expect(mockLogger.wasDebugCalled()).toBe(true);
expect(mockLogger.wasInfoCalled()).toBe(true);
expect(mockLogger.wasWarnCalled()).toBe(true);
expect(mockLogger.wasErrorCalled()).toBe(true);

// Check specific messages
expect(mockLogger.wasInfoCalledWith('Info message')).toBe(true);

// Get last log
expect(mockLogger.getLastInfo()?.message).toBe('Info message');
```

### Inspecting Logs

```typescript
// Get all logs by level
const allLogs = mockLogger.getAllLogs();
expect(allLogs).toHaveLength(4);

// Get log counts
const counts = mockLogger.getLogCounts();
expect(counts.debug).toBe(1);
expect(counts.info).toBe(1);
expect(counts.warn).toBe(1);
expect(counts.error).toBe(1);

// Check if any logs exist
expect(mockLogger.hasLogs()).toBe(true);
```

### Example: Testing Service Logging

```typescript
import { MockLogger } from '../test-utils';
import { TaskService } from '../services/task-service';

describe('TaskService', () => {
  let mockLogger: MockLogger;
  let service: TaskService;

  beforeEach(() => {
    mockLogger = new MockLogger();
    service = new TaskService(mockLogger);
  });

  it('should log task creation', async () => {
    // Act
    await service.createTask('test.task');

    // Assert
    expect(mockLogger.wasInfoCalledWith('Task created')).toBe(true);
    const lastInfo = mockLogger.getLastInfo();
    expect(lastInfo?.meta?.taskId).toBe('test.task');
  });

  it('should log errors on failure', async () => {
    // Arrange
    const error = new Error('Validation failed');

    // Act
    try {
      await service.createTask('invalid');
    } catch (e) {
      // Expected to throw
    }

    // Assert
    expect(mockLogger.wasErrorCalled()).toBe(true);
    expect(mockLogger.getLastError()?.error).toBe(error);
  });
});
```

## Test Data Fixtures

Pre-configured test data for common domain objects.

> 常见领域对象的预配置测试数据。

### Tasks

```typescript
import { testTasks } from '../test-utils';

// Available task fixtures:
testTasks.basicPending      // Simple pending task
testTasks.inProgress        // Task currently being worked on
testTasks.completed         // Finished task
testTasks.blocked           // Task with unsatisfied dependencies
testTasks.failed            // Task that failed
testTasks.highPriority      // Complex high-priority task

// Usage in tests
it('should process pending task', () => {
  const task = testTasks.basicPending;
  expect(task.status).toBe('pending');
  expect(task.dependencies).toHaveLength(0);
});
```

### States

```typescript
import { testStates } from '../test-utils';

// Available state fixtures:
testStates.clarify     // Initial clarify phase
testStates.breakdown   // Breakdown phase with PRD
testStates.implement   // Implementation phase with current task
testStates.heal        // Healing phase with errors
testStates.deliver     // Delivery phase (ready to commit)

// Usage in tests
it('should transition from implement to heal', () => {
  const state = testStates.implement;
  expect(state.phase).toBe('implement');
  expect(state.currentTask).toBe('auth.login.ui');
});
```

### Language Configurations

```typescript
import { testLanguageConfigs } from '../test-utils';

// Available language configs:
testLanguageConfigs.typescript  // TypeScript with React and Vitest
testLanguageConfigs.javascript  // JavaScript with Next.js
testLanguageConfigs.python      // Python with Django
testLanguageConfigs.go          // Go without framework
testLanguageConfigs.rust        // Rust with Cargo

// Usage in tests
it('should detect TypeScript project', () => {
  const config = testLanguageConfigs.typescript;
  expect(config.language).toBe('typescript');
  expect(config.framework).toBe('react');
  expect(config.testFramework).toBe('vitest');
  expect(config.verifyCommands).toContain('tsc --noEmit');
});
```

### Task Index

```typescript
import { testTaskIndex } from '../test-utils';

// Complete task index with metadata and multiple tasks
it('should load task index', () => {
  const index = testTaskIndex;
  expect(index.version).toBe('1.0.0');
  expect(index.tasks['auth.login.ui'].status).toBe('in_progress');
  expect(index.metadata.languageConfig.language).toBe('typescript');
});
```

### Task File Content

```typescript
import { testTaskFileContent } from '../test-utils';

// Sample task file content (Markdown with YAML frontmatter)
it('should parse task file', () => {
  const content = testTaskFileContent;
  expect(content).toContain('---');
  expect(content).toContain('id: auth.login.ui');
  expect(content).toContain('## Acceptance Criteria');
});
```

## Best Practices

### 1. Always Reset Mocks Between Tests

```typescript
beforeEach(() => {
  mockFs = new MockFileSystem();
  mockLogger = new MockLogger();
});

afterEach(() => {
  mockFs.reset();
  mockLogger.reset();
});
```

### 2. Use AAA Pattern (Arrange-Act-Assert)

```typescript
it('should create task file', async () => {
  // Arrange
  const task = testTasks.basicPending;
  const writer = new TaskWriter(mockFs);

  // Act
  await writer.writeTask('/tasks', task);

  // Assert
  expect(mockFs.hasFile('/tasks/setup/setup.scaffold.md')).toBe(true);
});
```

### 3. Test Behavior, Not Implementation

```typescript
// ✅ Good - Tests observable behavior
it('should persist task to file system', async () => {
  await service.createTask(testTasks.basicPending);
  expect(mockFs.hasFile('/tasks/setup/setup.scaffold.md')).toBe(true);
});

// ❌ Bad - Tests implementation details
it('should call writeFile with correct params', async () => {
  await service.createTask(testTasks.basicPending);
  expect(mockFs.writeFile).toHaveBeenCalledWith(/* ... */);
});
```

### 4. Use Test Fixtures for Consistency

```typescript
// ✅ Good - Uses shared fixture
it('should handle pending task', () => {
  const task = testTasks.basicPending;
  expect(service.canStart(task)).toBe(true);
});

// ❌ Bad - Creates ad-hoc test data
it('should handle pending task', () => {
  const task = {
    id: 'test',
    status: 'pending',
    // ... many more fields
  };
  expect(service.canStart(task)).toBe(true);
});
```

### 5. Verify Side Effects

```typescript
it('should log task creation', async () => {
  // Act
  await service.createTask(testTasks.basicPending);

  // Assert - Verify file was created
  expect(mockFs.hasFile('/tasks/setup/setup.scaffold.md')).toBe(true);

  // Assert - Verify logging occurred
  expect(mockLogger.wasInfoCalledWith('Task created')).toBe(true);
});
```

## Running Tests

```bash
# Run all test-utils tests
npm test src/test-utils

# Run specific mock test
npm test src/test-utils/mock-file-system.test.ts

# Run tests in watch mode
npm test:watch src/test-utils

# Run with coverage
npm test -- --coverage src/test-utils
```

## Coverage

The test-utils module has comprehensive test coverage:
- **MockFileSystem**: 100% coverage (35 tests)
- **MockLogger**: 100% coverage (33 tests)
- **Total**: 68 tests, all passing

> test-utils模块具有全面的测试覆盖率：
> - **MockFileSystem**：100%覆盖率（35个测试）
> - **MockLogger**：100%覆盖率（33个测试）
> - **总计**：68个测试，全部通过

## Contributing

When adding new mocks or test data:

1. Follow existing patterns for consistency
2. Add comprehensive tests for all mock functionality
3. Document usage with clear examples
4. Ensure 100% test coverage for mocks
5. Update this README with new utilities

> 添加新模拟或测试数据时：
>
> 1. 遵循现有模式以保持一致性
> 2. 为所有模拟功能添加全面测试
> 3. 用清晰的示例记录使用方法
> 4. 确保模拟的100%测试覆盖率
> 5. 用新工具更新此README

## References

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Unit Testing Best Practices](../../../CLAUDE.md#unit-testing-best-practices)
- [AAA Pattern](https://semaphore.io/blog/aaa-pattern-test-automation)
