import { Task } from '../core/task-parser';
import { LanguageConfig } from '../language/detector';

/**
 * Test data fixtures for use in tests
 *
 * Provides sample data for common domain objects used throughout the CLI.
 */

/**
 * Sample Task objects
 */
export const testTasks = {
  /**
   * A basic pending task with minimal configuration
   */
  basicPending: {
    id: 'setup.scaffold',
    module: 'setup',
    priority: 1,
    status: 'pending' as const,
    estimatedMinutes: 15,
    description: 'Create project scaffolding',
    acceptanceCriteria: [
      'Directory structure created',
      'Configuration files added',
    ],
    dependencies: [],
    notes: 'Initial setup task',
  } as Task,

  /**
   * A task currently in progress
   */
  inProgress: {
    id: 'auth.login.ui',
    module: 'auth',
    priority: 2,
    status: 'in_progress' as const,
    estimatedMinutes: 30,
    description: 'Implement login UI component',
    acceptanceCriteria: [
      'Login form with email and password fields',
      'Validation for required fields',
      'Submit button with loading state',
    ],
    dependencies: ['setup.scaffold'],
    testRequirements: {
      unit: {
        required: true,
        pattern: '**/*.test.tsx',
      },
    },
    notes: 'Use React Hook Form for form management',
  } as Task,

  /**
   * A completed task
   */
  completed: {
    id: 'auth.api.setup',
    module: 'auth',
    priority: 1,
    status: 'completed' as const,
    estimatedMinutes: 20,
    description: 'Set up authentication API endpoints',
    acceptanceCriteria: [
      'POST /api/auth/login endpoint created',
      'POST /api/auth/logout endpoint created',
      'Authentication middleware implemented',
    ],
    dependencies: ['setup.scaffold'],
    testRequirements: {
      unit: {
        required: true,
        pattern: '**/*.test.ts',
      },
      e2e: {
        required: true,
        pattern: '**/*.e2e.ts',
      },
    },
  } as Task,

  /**
   * A blocked task (has unsatisfied dependencies)
   */
  blocked: {
    id: 'auth.protected-routes',
    module: 'auth',
    priority: 3,
    status: 'blocked' as const,
    estimatedMinutes: 25,
    description: 'Implement protected route wrapper',
    acceptanceCriteria: [
      'Protected route component created',
      'Redirects to login if unauthenticated',
      'Preserves intended destination after login',
    ],
    dependencies: ['auth.login.ui', 'auth.api.setup'],
    testRequirements: {
      unit: {
        required: true,
        pattern: '**/*.test.tsx',
      },
    },
  } as Task,

  /**
   * A failed task
   */
  failed: {
    id: 'payment.stripe.integration',
    module: 'payment',
    priority: 2,
    status: 'failed' as const,
    estimatedMinutes: 45,
    description: 'Integrate Stripe payment processing',
    acceptanceCriteria: [
      'Stripe SDK configured',
      'Payment form component created',
      'Webhook handler for payment events',
    ],
    dependencies: ['auth.api.setup'],
    notes: 'Failed due to missing Stripe API keys',
  } as Task,

  /**
   * A high-priority task with complex requirements
   */
  highPriority: {
    id: 'core.database.migration',
    module: 'core',
    priority: 5,
    status: 'pending' as const,
    estimatedMinutes: 60,
    description: 'Create database migration system',
    acceptanceCriteria: [
      'Migration runner implemented',
      'Rollback functionality working',
      'Migration files generated automatically',
      'Up and down scripts for each migration',
    ],
    dependencies: ['setup.scaffold'],
    testRequirements: {
      unit: {
        required: true,
        pattern: '**/*.test.ts',
      },
      e2e: {
        required: true,
        pattern: '**/*.e2e.ts',
      },
    },
    notes: 'Use knex.js for migration management',
  } as Task,
};

/**
 * Sample State objects
 */
export const testStates = {
  /**
   * Initial clarify phase state
   */
  clarify: {
    phase: 'clarify' as const,
    startedAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T10:00:00.000Z',
  },

  /**
   * Breakdown phase with PRD
   */
  breakdown: {
    phase: 'breakdown' as const,
    prd: {
      title: 'Authentication System',
      description: 'Build a complete authentication system with login, signup, and protected routes',
      features: [
        'User login with email/password',
        'User registration',
        'Protected routes',
        'Session management',
      ],
    },
    startedAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T10:15:00.000Z',
  },

  /**
   * Implementation phase with current task
   */
  implement: {
    phase: 'implement' as const,
    currentTask: 'auth.login.ui',
    prd: {
      title: 'Authentication System',
      description: 'Build a complete authentication system',
    },
    startedAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T10:30:00.000Z',
  },

  /**
   * Healing phase with errors
   */
  heal: {
    phase: 'heal' as const,
    currentTask: 'auth.login.ui',
    errors: [
      {
        type: 'test_failure',
        message: 'Login form validation test failed',
        details: 'Expected "Email is required" but got undefined',
      },
      {
        type: 'lint_error',
        message: 'ESLint errors found',
        details: 'Unused variable "handleSubmit"',
      },
    ],
    startedAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T11:00:00.000Z',
  },

  /**
   * Delivery phase (ready to commit)
   */
  deliver: {
    phase: 'deliver' as const,
    currentTask: 'auth.login.ui',
    prd: {
      title: 'Authentication System',
      description: 'Build a complete authentication system',
    },
    startedAt: '2024-01-20T10:00:00.000Z',
    updatedAt: '2024-01-20T11:30:00.000Z',
  },
};

/**
 * Sample LanguageConfig objects
 */
export const testLanguageConfigs = {
  /**
   * TypeScript with React and Vitest
   */
  typescript: {
    language: 'typescript',
    framework: 'react',
    testFramework: 'vitest',
    buildTool: 'vite',
    verifyCommands: [
      'tsc --noEmit',
      'npm run lint',
      'npm test',
      'npm run build',
    ],
  } as LanguageConfig,

  /**
   * JavaScript with Next.js
   */
  javascript: {
    language: 'javascript',
    framework: 'next.js',
    testFramework: 'jest',
    buildTool: 'webpack',
    verifyCommands: [
      'npm run lint',
      'npm test',
      'npm run build',
    ],
  } as LanguageConfig,

  /**
   * Python with Django
   */
  python: {
    language: 'python',
    framework: 'django',
    testFramework: 'pytest',
    buildTool: 'pip',
    verifyCommands: [
      'python -m pylint .',
      'python -m pytest',
    ],
  } as LanguageConfig,

  /**
   * Go without framework
   */
  go: {
    language: 'go',
    testFramework: 'testing',
    buildTool: 'go',
    verifyCommands: [
      'go vet ./...',
      'go test ./...',
      'go build',
    ],
  } as LanguageConfig,

  /**
   * Rust with Cargo
   */
  rust: {
    language: 'rust',
    testFramework: 'cargo-test',
    buildTool: 'cargo',
    verifyCommands: [
      'cargo clippy',
      'cargo test',
      'cargo build',
    ],
  } as LanguageConfig,
};

/**
 * Sample task index structure
 */
export const testTaskIndex = {
  version: '1.0.0',
  updatedAt: '2024-01-20T10:00:00.000Z',
  metadata: {
    projectGoal: 'Build a complete authentication system with modern best practices',
    languageConfig: testLanguageConfigs.typescript,
  },
  tasks: {
    'setup.scaffold': {
      status: 'completed',
      priority: 1,
      module: 'setup',
      description: 'Create project scaffolding',
      filePath: '.ralph-dev/tasks/setup/setup.scaffold.md',
    },
    'auth.login.ui': {
      status: 'in_progress',
      priority: 2,
      module: 'auth',
      description: 'Implement login UI component',
      filePath: '.ralph-dev/tasks/auth/auth.login.ui.md',
    },
    'auth.api.setup': {
      status: 'completed',
      priority: 1,
      module: 'auth',
      description: 'Set up authentication API endpoints',
      filePath: '.ralph-dev/tasks/auth/auth.api.setup.md',
    },
    'auth.protected-routes': {
      status: 'pending',
      priority: 3,
      module: 'auth',
      description: 'Implement protected route wrapper',
      filePath: '.ralph-dev/tasks/auth/auth.protected-routes.md',
    },
  },
};

/**
 * Sample task file content (Markdown with YAML frontmatter)
 */
export const testTaskFileContent = `---
id: auth.login.ui
module: auth
priority: 2
status: pending
estimatedMinutes: 30
dependencies:
  - setup.scaffold
testRequirements:
  unit:
    required: true
    pattern: "**/*.test.tsx"
---

# Implement login UI component

## Acceptance Criteria
1. Login form with email and password fields
2. Validation for required fields
3. Submit button with loading state

## Notes
Use React Hook Form for form management
`;
