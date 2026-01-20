# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph-dev CLI is a TypeScript command-line tool for managing AI agent workflow state and tasks. It's designed to be called from Ralph-dev skills during autonomous development phases (clarify, breakdown, implement, heal, deliver).

**Key Design Principles:**
- Zero-config: Works without setup, creates `.ralph-dev/` on first use
- CLI-first: All operations available via command-line for bash integration
- JSON output: Every command supports `--json` flag for scripting
- Workspace isolation: Uses `RALPH_DEV_WORKSPACE` env var or `process.cwd()`

## Development Commands

### Build and Test
```bash
# Development with watch mode
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run single test file
npx vitest run src/core/task-parser.test.ts

# Run tests with coverage
npx vitest run --coverage

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

### Core Design Patterns

**1. Saga Pattern (src/core/saga-manager.ts)**
- Ensures atomic operations with automatic rollback on failure
- Each workflow phase (init, breakdown, implement, heal, deliver) uses sagas
- Steps must implement `execute()` and `compensate()` methods
- Logs all operations to `.ralph-dev/saga.log` for debugging

**2. Structured Output Parsing (src/core/structured-output.ts)**
- Replaces brittle YAML parsing with Claude's native tool calling
- Agents report results via `report_implementation_result` tool
- Falls back to JSON blocks and YAML blocks for compatibility
- Uses Zod schemas for validation

**3. Command Registration Pattern (src/index.ts)**
- Each command group (state, tasks, detect) has a `register*Commands` function
- All commands accept `workspaceDir` parameter for isolation
- Commands use Commander.js with subcommands (e.g., `tasks create`, `tasks list`)

### Key Modules

**State Management (src/commands/state.ts)**
- Manages `.ralph-dev/state.json` with current phase and task
- Phases: `clarify`, `breakdown`, `implement`, `heal`, `deliver`
- Tracks PRD, errors array, and timestamps

**Task System (src/commands/tasks.ts)**
- Tasks stored as Markdown files with YAML frontmatter in `.ralph-dev/tasks/{module}/{taskId}.md`
- Index maintained in `.ralph-dev/tasks/index.json` for fast lookups
- Task lifecycle: `pending` → `in_progress` → `completed`/`failed`
- `tasks next` returns highest-priority pending task with full context (git info, progress stats, dependencies)

**Language Detection (src/language/detector.ts)**
- Supports 10+ languages: TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Scala, C++, etc.
- Detects framework (React, Next.js, Vue, etc.) and test framework (Jest, Vitest, pytest, etc.)
- Returns `verifyCommands` array for type-checking, linting, testing, building

### File Structure
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

1. **Test Fixture Conflicts**: Use unique directory names per test file (e.g., `test-fixtures-task-parser`) to avoid ENOTEMPTY errors during parallel test execution.

2. **Emoji vs Text Symbols**: CLI output uses plain text symbols (✓, ✗, →) not emoji (✅, ❌, ▶️) for better terminal compatibility.

3. **ES Module Imports**: This is an ES module project. Use `import` statements, not `require()`. Test files should use async imports: `await import('./module')`.

4. **Task Index Sync**: After modifying task files directly, call `IndexManager.addOrUpdateTask()` to keep index.json in sync.

5. **YAML Frontmatter Parsing**: Use `TaskParser.parseTaskFile()` which handles the three-dash delimiter correctly. Don't use generic YAML parsers directly.

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

## Code Conventions

- **Imports**: Group by external → internal → types
- **Error handling**: Always use centralized error creators
- **JSON output**: Every command must support `--json` flag
- **Console output**: Use `chalk` for colors, minimize noise in JSON mode
- **File operations**: Use `fs-extra` for Promise-based APIs
- **Validation**: Use Zod schemas for structured data

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
