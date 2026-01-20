# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph-dev CLI is a TypeScript command-line tool for managing AI agent workflow state and tasks. It's designed to be called from Ralph-dev skills during autonomous development phases (clarify, breakdown, implement, heal, deliver).

**Key Design Principles:**
- Zero-config: Works without setup, creates `.ralph-dev/` on first use
- CLI-first: All operations available via command-line for bash integration
- JSON output: Every command supports `--json` flag for scripting
- Workspace isolation: Uses `RALPH_DEV_WORKSPACE` env var or `process.cwd()`
- Layered architecture: Clear separation between commands, services, repositories, domain, and infrastructure

## Quick Start for New Features

When adding a new feature, follow this layered approach:

### Step 1: Define Domain Entity (if needed)

Create rich entity with behavior in `src/domain/`:

```typescript
// src/domain/my-entity.ts
export class MyEntity {
  constructor(
    public readonly id: string,
    private _status: string
  ) {}

  get status(): string {
    return this._status;
  }

  canTransition(): boolean {
    return this._status === 'ready';
  }

  transition(): void {
    if (!this.canTransition()) {
      throw new Error('Invalid state transition');
    }
    this._status = 'done';
  }
}
```

### Step 2: Create Repository Interface

Define data access interface in `src/repositories/`:

```typescript
// src/repositories/my-repository.ts
export interface IMyRepository {
  findById(id: string): Promise<MyEntity | null>;
  save(entity: MyEntity): Promise<void>;
}
```

### Step 3: Implement Repository

Create file system implementation:

```typescript
// src/repositories/my-repository.service.ts
export class FileSystemMyRepository implements IMyRepository {
  constructor(
    private fileSystem: IFileSystem,
    private dataDir: string
  ) {}

  async findById(id: string): Promise<MyEntity | null> {
    // Use fileSystem interface, not fs directly
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (!(await this.fileSystem.exists(filePath))) {
      return null;
    }
    const data = await this.fileSystem.readFile(filePath, 'utf-8');
    return this.deserialize(JSON.parse(data as string));
  }
}
```

### Step 4: Create Service

Implement business logic in `src/services/`:

```typescript
// src/services/my-service.ts
export interface IMyService {
  processEntity(id: string): Promise<MyEntity>;
}

export class MyService implements IMyService {
  constructor(
    private myRepo: IMyRepository,
    private logger: ILogger
  ) {}

  async processEntity(id: string): Promise<MyEntity> {
    const entity = await this.myRepo.findById(id);
    if (!entity) {
      throw new Error(`Entity ${id} not found`);
    }

    this.logger.info('Processing entity', { id });
    entity.transition();
    await this.myRepo.save(entity);
    return entity;
  }
}
```

### Step 5: Add to Service Factory

Wire up dependencies in `src/commands/service-factory.ts`:

```typescript
export function createMyService(workspaceDir: string): IMyService {
  const logger = new ConsoleLogger();
  const fileSystem = new FileSystemService();
  const dataDir = path.join(workspaceDir, '.ralph-dev', 'my-data');
  const myRepo = new FileSystemMyRepository(fileSystem, dataDir);
  return new MyService(myRepo, logger);
}
```

### Step 6: Create Command

Add thin command layer in `src/commands/`:

```typescript
// src/commands/my-command.ts
export function registerMyCommands(program: Command) {
  const my = program.command('my');

  my.command('process <id>')
    .option('--json', 'Output JSON')
    .action(async (id, options) => {
      const workspaceDir = process.env.RALPH_DEV_WORKSPACE || process.cwd();
      const myService = createMyService(workspaceDir);

      try {
        const entity = await myService.processEntity(id);

        if (options.json) {
          outputResponse({ entity }, options.json);
        } else {
          console.log(`Processed ${entity.id}: ${entity.status}`);
        }
      } catch (error) {
        handleError(error, options.json);
      }
    });
}
```

### Step 7: Write Tests

Test each layer in isolation:

```typescript
// Service test with mock repository
describe('MyService', () => {
  it('should process entity', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(new MyEntity('test', 'ready')),
      save: vi.fn(),
    };
    const service = new MyService(mockRepo, new MockLogger());

    const result = await service.processEntity('test');

    expect(result.status).toBe('done');
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

## Development Commands

### Build and Test

**IMPORTANT:** Always use `CI=true` when running tests to prevent interactive/watch mode which can hang the process.

```bash
# Development with watch mode
npm run dev

# Run all tests (MUST use CI=true)
CI=true npm test

# Run single test file
CI=true npx vitest run src/core/task-parser.test.ts

# Run tests with coverage
CI=true npx vitest run --coverage

# Build for production
npm run build

# Lint
npm run lint

# Format code
npm run format
```

### Testing Architecture
- **Framework**: Vitest with @vitest/coverage-v8
- **Test files**: Located alongside source files (e.g., `task-parser.ts` → `task-parser.test.ts`)
- **Coverage target**: Currently 84.52% overall (industry standard: 80%+)
- **CI behavior**: Vitest automatically detects CI environments (when `CI=true`) and runs in non-watch mode

### Unit Testing Best Practices

**1. AAA Pattern (Arrange-Act-Assert)**

Structure every test with three distinct phases:
```typescript
it('should add two numbers correctly', () => {
  // Arrange: Set up test conditions
  const calculator = new Calculator();
  const a = 5;
  const b = 3;

  // Act: Perform the action being tested
  const result = calculator.add(a, b);

  // Assert: Verify the outcome
  expect(result).toBe(8);
});
```

**2. Test Naming Conventions**

Use clear, descriptive names following one of these patterns:
- `Method_Scenario_ExpectedBehavior`: `parseTaskFile_WithValidYAML_ReturnsTaskObject`
- `should + behavior`: `should parse valid task file with YAML frontmatter`
- `Given_When_Then` (BDD style): `Given_ValidTaskFile_When_Parsing_Then_ReturnsTaskObject`

**3. Test Isolation**

- Each test must run independently and in any order
- Use `beforeEach` to set up fresh state for each test
- Use `afterEach` to clean up resources (temp files, mocks)
- Never share mutable state between tests
- Use unique temp directories per test file to avoid conflicts

```typescript
describe('TaskWriter', () => {
  let testDir: string;

  beforeEach(() => {
    // Fresh directory for each test
    testDir = path.join(__dirname, `../../test-temp-${Date.now()}`);
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    // Clean up after each test
    fs.removeSync(testDir);
  });
});
```

**4. Mocking Strategy**

- Mock only external dependencies (file system, APIs, databases)
- Don't mock the code under test
- Use Vitest's `vi.mock()` for module mocking
- Use `vi.spyOn()` for spying on methods
- Set `mockReset: true` in vitest.config.ts to auto-reset mocks

```typescript
// Mock process.exit to prevent tests from actually exiting
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

// Mock console methods to capture output
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
```

**5. Environment Variables in Tests**

- Use `vi.stubEnv()` to mock environment variables:
```typescript
beforeEach(() => {
  vi.stubEnv('RALPH_DEV_WORKSPACE', '/test/workspace');
});

afterEach(() => {
  vi.unstubAllEnvs();
});
```

- Set `unstubEnvs: true` in vitest.config.ts to auto-restore after each test

**6. Code Coverage Guidelines**

- **Target**: 80%+ overall coverage (current: 84.52%)
- **Critical code**: Aim for 90-95% coverage on core modules
- **Focus**: The 20% uncovered code matters more than the 80% covered
- **New code**: Should maintain or improve overall coverage
- **Don't game metrics**: Focus on meaningful tests, not just hitting percentages

**7. Test Organization**

- Group related tests with `describe` blocks
- Use nested `describe` for sub-features or methods
- Keep test files small and focused (one module per file)
- Co-locate tests with source files

```typescript
describe('TaskParser', () => {
  describe('parseTaskFile', () => {
    it('should parse valid task file', () => { /* ... */ });
    it('should throw on invalid YAML', () => { /* ... */ });
  });

  describe('extractFrontmatter', () => {
    it('should extract YAML frontmatter', () => { /* ... */ });
  });
});
```

**8. Behavior Over Implementation**

- Test what users see and experience, not internal implementation
- Don't test private methods directly
- Focus on public API contracts
- Tests should survive refactoring

**9. CI/CD Integration**

- Tests run automatically in CI when `CI=true` is set
- Vitest detects CI and runs in non-watch mode
- Use GitHub Actions, GitLab CI, or Jenkins
- Block merges if tests fail or coverage drops

**10. Common Anti-Patterns to Avoid**

- ❌ Testing implementation details instead of behavior
- ❌ Brittle tests that break with refactoring
- ❌ Slow tests that hit real databases/APIs
- ❌ Tests that depend on execution order
- ❌ Assertion-free tests that always pass
- ❌ Testing multiple behaviors in one test
- ❌ Ignoring failing tests with `it.skip()` long-term

**Test Patterns Used in This Project:**
- Use `beforeEach`/`afterEach` for test isolation with unique temp directories
- Mock `console.log`, `console.error`, and `process.exit` in CLI command tests
- Use `fs-extra` for file system operations in tests
- Use `expect.stringContaining()` for flexible string matching
- Mock Commander.js program parsing with `program.parseAsync()`

## Architecture

Ralph-dev CLI uses a **layered architecture** with clear separation of concerns:

```
Commands (CLI Interface - Thin Layer)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access)
    ↓
Domain Models (Entities with Behavior)
    ↓
Infrastructure (File System, Logger, Git)
```

### Layered Architecture Pattern

**1. Command Layer (src/commands/)**
- **Responsibility**: CLI interface, argument parsing, output formatting
- **Pattern**: Thin layer that delegates to service layer
- **Example**: `tasks.ts`, `state.ts`, `status.ts`
- Commands should NOT contain business logic or file system access

**2. Service Layer (src/services/)**
- **Responsibility**: Business logic, orchestration, validation
- **Pattern**: Service classes with dependency injection
- **Example**: `TaskService`, `StateService`, `StatusService`, `DetectionService`, `SagaService`, `HealingService`
- Services coordinate between repositories and domain models

**3. Repository Layer (src/repositories/)**
- **Responsibility**: Data persistence and retrieval
- **Pattern**: Repository pattern with interfaces
- **Example**: `ITaskRepository`, `IStateRepository`
- Implementations: `FileSystemTaskRepository`, `FileSystemStateRepository`
- Abstracts file system details, maintains index.json

**4. Domain Layer (src/domain/)**
- **Responsibility**: Business entities with behavior
- **Pattern**: Rich domain models (not anemic data bags)
- **Example**: `Task`, `State`, `LanguageConfig`
- Entities enforce business rules and state transitions

**5. Infrastructure Layer (src/infrastructure/)**
- **Responsibility**: Technical concerns (file I/O, logging, Git)
- **Pattern**: Interface-based abstractions
- **Example**: `IFileSystem`, `ILogger`
- Implementations: `FileSystemService`, `ConsoleLogger`

### Core Design Patterns

**1. Dependency Injection via Service Factory (src/commands/service-factory.ts)**
- Central factory for creating and wiring services with dependencies
- Provides `createServices()` for full container
- Provides convenience functions: `createTaskService()`, `createStateService()`, `createStatusService()`, `createDetectionService()`

**Usage in Commands:**
```typescript
import { createTaskService } from './service-factory';

export function registerTaskCommands(program: Command) {
  const tasks = program.command('tasks');

  tasks
    .command('create <taskId>')
    .action(async (taskId, options) => {
      const workspaceDir = process.env.RALPH_DEV_WORKSPACE || process.cwd();
      const taskService = createTaskService(workspaceDir);
      const task = await taskService.createTask({ id: taskId, ... });
      // Format and output result
    });
}
```

**2. Repository Pattern (src/repositories/)**
- Abstracts data persistence behind interfaces
- Makes services testable with mock repositories
- Supports swapping implementations (file system → database)

**Interface Example:**
```typescript
export interface ITaskRepository {
  findById(taskId: string): Promise<Task | null>;
  findAll(filter?: TaskFilter): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(taskId: string): Promise<void>;
  findNext(): Promise<Task | null>;
}
```

**3. Rich Domain Models (src/domain/task-entity.ts)**
- Entities contain behavior, not just data
- Enforce business rules and invariants
- Encapsulate state transitions

**Example:**
```typescript
export class Task {
  private _status: TaskStatus;

  canStart(): boolean {
    return this._status === 'pending';
  }

  start(): void {
    if (!this.canStart()) {
      throw new Error('Cannot start non-pending task');
    }
    this._status = 'in_progress';
    this._startedAt = new Date();
  }

  isBlocked(completedTaskIds: Set<string>): boolean {
    return this.dependencies.some(dep => !completedTaskIds.has(dep));
  }
}
```

**4. Saga Pattern (src/services/saga-service.ts)**
- Ensures atomic operations with automatic rollback on failure
- Each workflow phase (init, breakdown, implement, heal, deliver) uses sagas
- Steps must implement `execute()` and `compensate()` methods
- Logs all operations to `.ralph-dev/saga.log` for debugging

**5. Circuit Breaker Pattern (src/services/healing-service.ts)**
- Prevents cascade failures in healing phase
- Tracks failure count and opens circuit after threshold (default: 5 failures)
- Auto-reset after timeout period (default: 60 seconds)
- States: CLOSED (normal), OPEN (fast-fail), HALF_OPEN (testing recovery)

**6. Structured Output Parsing (src/core/structured-output.ts)**
- Replaces brittle YAML parsing with Claude's native tool calling
- Agents report results via `report_implementation_result` tool
- Falls back to JSON blocks and YAML blocks for compatibility
- Uses Zod schemas for validation

### Key Services

**TaskService (src/services/task-service.ts)**
- Business logic for task management
- Methods: `createTask()`, `getTask()`, `listTasks()`, `getNextTask()`, `startTask()`, `completeTask()`, `failTask()`
- Coordinates with `ITaskRepository` and `IStateRepository`
- Validates business rules (dependency satisfaction, status transitions)

**StateService (src/services/state-service.ts)**
- Manages workflow phase state
- Phases: `clarify`, `breakdown`, `implement`, `heal`, `deliver`
- Tracks current task, PRD, errors, timestamps
- Coordinates with `IStateRepository`

**StatusService (src/services/status-service.ts)**
- Provides system status overview
- Aggregates task statistics and state information
- Used by `status` command

**DetectionService (src/services/detection-service.ts)**
- Language and framework detection
- Supports 10+ languages: TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Scala, C++, etc.
- Detects framework (React, Next.js, Vue, etc.) and test framework (Jest, Vitest, pytest, etc.)
- Returns `verifyCommands` array for type-checking, linting, testing, building

**HealingService (src/services/healing-service.ts)**
- Manages error recovery with circuit breaker
- Tracks healing attempts and prevents infinite loops
- Configurable failure threshold and timeout

### File Structure

**Workspace Structure:**
```
.ralph-dev/
├── state.json           # Current workflow phase and task
├── tasks/
│   ├── index.json       # Task metadata and index
│   └── {module}/
│       └── {taskId}.md  # Task files (YAML frontmatter + markdown)
├── saga.log             # Saga execution history
└── progress.log         # Task completion history
```

**Source Code Structure:**
```
cli/src/
├── commands/              # CLI interface (thin layer)
│   ├── service-factory.ts # Dependency injection container
│   ├── tasks.ts           # Task commands
│   ├── state.ts           # State commands
│   └── status.ts          # Status command
├── services/              # Business logic layer
│   ├── task-service.ts    # Task management logic
│   ├── state-service.ts   # State management logic
│   ├── status-service.ts  # Status reporting logic
│   ├── detection-service.ts # Language detection logic
│   ├── saga-service.ts    # Saga orchestration
│   └── healing-service.ts # Error recovery with circuit breaker
├── repositories/          # Data access layer
│   ├── task-repository.ts # Task repository interface
│   ├── task-repository.service.ts # File system implementation
│   ├── state-repository.ts # State repository interface
│   └── state-repository.service.ts # File system implementation
├── domain/                # Domain entities with behavior
│   ├── task-entity.ts     # Task entity
│   ├── state-entity.ts    # State entity
│   └── language-config.ts # Language configuration value object
├── infrastructure/        # Technical infrastructure
│   ├── file-system.ts     # File system interface
│   ├── file-system.service.ts # File system implementation with retry
│   ├── logger.ts          # Logger interface
│   └── logger.service.ts  # Console logger implementation
├── core/                  # Core utilities
│   ├── task-parser.ts     # YAML frontmatter parsing
│   ├── index-manager.ts   # Task index management
│   ├── error-handler.ts   # Error handling
│   └── exit-codes.ts      # Exit code constants
└── test-utils/            # Test utilities
    ├── mock-task-repository.ts
    ├── mock-state-repository.ts
    ├── mock-file-system.ts
    └── mock-logger.ts
```

### Architecture Benefits

**1. Testability**
- Services can be tested in isolation with mock repositories
- Commands can be tested by mocking the service factory
- No need to touch the file system in most tests
- Fast unit tests (ms rather than seconds)

**2. Maintainability**
- Clear separation of concerns (each layer has single responsibility)
- Changes to data storage only affect repository layer
- Business logic changes isolated to service layer
- Easy to find where logic lives

**3. Flexibility**
- Easy to swap implementations (e.g., file system → database)
- Can add new features without modifying existing code
- Dependency injection makes components reusable

**4. Reliability**
- Circuit breaker prevents cascade failures
- Retry logic handles transient errors
- Saga pattern ensures atomic operations with rollback
- Rich domain models enforce business rules

## Important Implementation Details

### Task File Format
Task files use YAML frontmatter with markdown body:
```markdown
---
id: auth.login.ui
module: auth
priority: 2
status: pending
estimatedMinutes: 25
dependencies:
  - setup.scaffold
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.ts"
---

# Task Description

## Acceptance Criteria
1. Criterion 1
2. Criterion 2

## Notes
Additional context...
```

### Structured Output Tool Calling
When implementing features that process agent output, prefer the tool calling format:
```xml
<tool_call>
<name>report_implementation_result</name>
<input>{"task_id":"auth.login","status":"success","verification_passed":true,"notes":"..."}</input>
</tool_call>
```

The parser also supports JSON blocks (```json) and legacy YAML blocks (---IMPLEMENTATION RESULT---) for backward compatibility.

### Environment Variables
- `RALPH_DEV_WORKSPACE`: Overrides workspace directory (default: `process.cwd()`)
- Used by parent Ralph-dev system to isolate multiple projects

### Exit Codes (src/core/exit-codes.ts)
- `0`: Success
- `1`: General error
- `2`: Not found (task, state, file)
- `3`: Invalid input (validation failed)
- `4`: Conflict (duplicate task ID)
- `5`: System error (file system, permissions)

### Error Handling Pattern (src/core/error-handler.ts)
All commands use centralized error handling:
```typescript
import { handleError, taskNotFound } from '../core/error-handler';

try {
  // ... operation
} catch (error) {
  handleError(error, jsonMode);
}
```

Error creators: `taskNotFound()`, `stateNotFound()`, `invalidInput()`, `taskExists()`, `fileError()`

## Common Pitfalls

### Architecture Violations

1. **Business Logic in Commands**: ❌ Don't put business logic in command handlers
   - Commands should only parse arguments, call services, and format output
   - Move all validation and business rules to service layer

2. **Direct File System Access**: ❌ Don't use `fs` or `fs-extra` directly in commands or services
   - Use `IFileSystem` interface injected via constructor
   - This makes code testable and allows retry logic

3. **Creating Dependencies**: ❌ Don't instantiate dependencies inside classes
   - Use constructor injection for all dependencies
   - Let service factory wire up dependencies

4. **Anemic Domain Models**: ❌ Don't create entities that are just data bags
   - Add behavior methods to domain entities
   - Enforce business rules in entity methods, not services

5. **Leaky Abstractions**: ❌ Don't let repository implementation details leak to service layer
   - Services should work with domain entities, not file paths
   - Repository handles all file system concerns

### Implementation Pitfalls

6. **Test Fixture Conflicts**: Use unique directory names per test file (e.g., `test-fixtures-task-parser`) to avoid ENOTEMPTY errors during parallel test execution.

7. **Emoji vs Text Symbols**: CLI output uses plain text symbols (✓, ✗, →) not emoji (✅, ❌, ▶️) for better terminal compatibility.

8. **ES Module Imports**: This is an ES module project. Use `import` statements, not `require()`. Test files should use async imports: `await import('./module')`.

9. **Task Index Sync**: After modifying task files directly, repositories automatically maintain index.json consistency.

10. **YAML Frontmatter Parsing**: Use `TaskParser.parseTaskFile()` which handles the three-dash delimiter correctly. Don't use generic YAML parsers directly.

### Testing Pitfalls

11. **Mocking Internal Code**: ❌ Don't mock the code you're testing
    - Only mock external boundaries (file system, APIs, time)
    - Test real business logic with mock dependencies

12. **Testing Implementation**: ❌ Don't assert on function call counts or internal state
    - Test observable behavior and outcomes
    - Tests should survive refactoring

## Integration Points

### Bootstrap Integration
The CLI is bootstrapped by `shared/bootstrap-cli.sh`:
1. Checks if binary exists at `cli/bin/ralph-dev.js`
2. Runs `npm install && npm run build` on first use
3. Exports `ralph-dev()` bash function for skills
4. Subsequent runs use cached binary

### Skill Integration Pattern
Skills call CLI commands via bash:
```bash
# Get next task
TASK_JSON=$(ralph-dev tasks next --json)
TASK_ID=$(echo "$TASK_JSON" | jq -r '.task.id')

# Update state
ralph-dev state update --task "$TASK_ID"
ralph-dev tasks start "$TASK_ID"

# ... implement task ...

# Report completion
ralph-dev tasks done "$TASK_ID" --duration "5m30s"
```

### Service Layer Testing Pattern

When testing services, use mock repositories:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '../services/task-service';
import { MockTaskRepository } from '../test-utils/mock-task-repository';
import { MockStateRepository } from '../test-utils/mock-state-repository';
import { MockLogger } from '../test-utils/mock-logger';

describe('TaskService', () => {
  let taskService: TaskService;
  let mockTaskRepo: MockTaskRepository;
  let mockStateRepo: MockStateRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockTaskRepo = new MockTaskRepository();
    mockStateRepo = new MockStateRepository();
    mockLogger = new MockLogger();
    taskService = new TaskService(mockTaskRepo, mockStateRepo, mockLogger);
  });

  it('should create a task', async () => {
    const input = {
      id: 'test.task',
      module: 'test',
      description: 'Test task',
    };

    const task = await taskService.createTask(input);

    expect(task.id).toBe('test.task');
    expect(task.status).toBe('pending');
  });
});
```

### Command Layer Testing Pattern

When testing commands, mock the service factory:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';
import { registerTaskCommands } from '../commands/tasks';
import * as serviceFactory from '../commands/service-factory';

describe('task commands', () => {
  it('should call TaskService.createTask', async () => {
    const mockTaskService = {
      createTask: vi.fn().mockResolvedValue({ id: 'test.task', status: 'pending' }),
    };

    vi.spyOn(serviceFactory, 'createTaskService').mockReturnValue(mockTaskService);

    const program = new Command();
    registerTaskCommands(program);
    await program.parseAsync(['node', 'test', 'tasks', 'create', 'test.task']);

    expect(mockTaskService.createTask).toHaveBeenCalled();
  });
});
```

## Code Conventions

### Layered Architecture Rules

**Command Layer:**
- Keep commands thin - only parse args, call services, format output
- NEVER put business logic in commands
- NEVER access file system directly from commands
- Use service factory for dependency injection
- Support `--json` flag for all commands

**Service Layer:**
- Implement business logic and validation
- Coordinate between repositories and domain entities
- Accept dependencies via constructor injection
- Define interface for each service (e.g., `ITaskService`)
- Return domain entities, not plain objects

**Repository Layer:**
- Abstract all data persistence behind interfaces
- Use domain entities for input/output
- Handle file system errors and retries
- Maintain data consistency (e.g., keep index.json in sync)

**Domain Layer:**
- Create rich entities with behavior methods
- Enforce business rules and invariants
- Use private fields with getter methods
- Throw errors for invalid state transitions
- Keep domain logic pure (no I/O)

**Infrastructure Layer:**
- Provide technical services (file I/O, logging)
- Define interfaces for mockability
- Implement retry logic for transient failures
- Keep implementations simple and focused

### General Conventions

- **Imports**: Group by external → internal → types
- **Error handling**: Always use centralized error creators from `error-handler.ts`
- **JSON output**: Every command must support `--json` flag
- **Console output**: Use `chalk` for colors, minimize noise in JSON mode
- **File operations**: Use `IFileSystem` interface, not direct `fs` calls
- **Validation**: Use Zod schemas for structured data
- **Testing**: Test behavior, not implementation; mock external boundaries only
- **Naming**: Use descriptive names that reveal intent (avoid abbreviations)

### Dependency Injection Pattern

Always inject dependencies via constructor:

```typescript
// ✅ Good - Dependencies injected
export class TaskService {
  constructor(
    private taskRepo: ITaskRepository,
    private stateRepo: IStateRepository,
    private logger: ILogger
  ) {}
}

// ❌ Bad - Creates own dependencies
export class TaskService {
  private taskRepo = new FileSystemTaskRepository();
  private logger = console;
}
```

### Interface Naming

Use `I` prefix for interfaces:

```typescript
// ✅ Good
export interface ITaskRepository { ... }
export class FileSystemTaskRepository implements ITaskRepository { ... }

// ❌ Bad
export interface TaskRepository { ... }
export class TaskRepositoryImpl implements TaskRepository { ... }
```

## References

### Unit Testing Best Practices
- [A Beginner's Guide to Unit Testing with Vitest | Better Stack Community](https://betterstack.com/community/guides/testing/vitest-explained/)
- [How to Unit Test React Components with Vitest and React Testing Library](https://oneuptime.com/blog/post/2026-01-15-unit-test-react-vitest-testing-library/view)
- [Unit Testing with Vitest | CS4530, Spring 2026](https://neu-se.github.io/CS4530-Spring-2026/tutorials/week1-unit-testing)
- [10 Tips for Success with Typescript Unit Testing | early Blog](https://www.startearly.ai/post/typescript-unit-testing-tips)
- [Best Techniques to Create Tests with the Vitest Framework - DEV Community](https://dev.to/wallacefreitas/best-techniques-to-create-tests-with-the-vitest-framework-9al)
- [Mastering Testing with Vitest and TypeScript | XJavaScript.com](https://www.xjavascript.com/blog/vitest-typescript/)

### CI Environment and Mocking
- [Test Environment | Guide | Vitest](https://vitest.dev/guide/environment)
- [Features | Guide | Vitest](https://vitest.dev/guide/features)
- [Environment Variables · Jest](https://jestjs.io/docs/environment-variables)
- [Module and environment variable stubbing for efficient testing in Vitest](https://mayashavin.com/articles/mock-module-stub-variable-vitest)
- [How to Mock process.env in Jest: A Complete Guide | Medium](https://medium.com/@aleksej.gudkov/how-to-mock-process-env-in-jest-a-complete-guide-241da0dea88d)

### AAA Pattern and Test Organization
- [Unit Testing Best Practices | IBM](https://www.ibm.com/think/insights/unit-testing-best-practices)
- [The Arrange, Act, and Assert (AAA) Pattern in Unit Test Automation - Semaphore](https://semaphore.io/blog/aaa-pattern-test-automation)
- [Unit Test Naming Conventions Best Practices - TheCodeBuzz](https://thecodebuzz.com/tdd-unit-testing-naming-conventions-and-standards/)
- [Unit Test Best Practices: Top 10 Tips with Examples](https://dualite.dev/blog/unit-test-best-practices)
- [AAA Unit Testing | Medium](https://medium.com/@rojasjimenezjosea/aaa-unit-testing-688e3e61902a)
- [Best practices for writing unit tests - .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices)
- [Mastering Unit Tests in.NET: Best Practices and Naming Conventions - Ardalis](https://ardalis.com/mastering-unit-tests-dotnet-best-practices-naming-conventions/)

### Code Coverage Standards
- [What unit test coverage percentage should teams aim for? | TechTarget](https://www.techtarget.com/searchsoftwarequality/tip/What-unit-test-coverage-percentage-should-teams-aim-for)
