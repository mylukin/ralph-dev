# Ralph-dev System Architecture

Comprehensive architecture documentation for the autonomous end-to-end development system.
> 自主端到端开发系统的综合架构文档。

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [5-Phase Workflow](#3-5-phase-workflow)
4. [CLI Layered Architecture](#4-cli-layered-architecture)
5. [Skills System](#5-skills-system)
6. [Plugin Infrastructure](#6-plugin-infrastructure)
7. [Data Flow](#7-data-flow)
8. [Directory Structure](#8-directory-structure)
9. [Error Handling & Recovery](#9-error-handling--recovery)
10. [Technology Stack](#10-technology-stack)

---

## 1. Overview

Ralph-dev is an **autonomous end-to-end development system** that transforms natural language requirements into production-ready, tested code through a 5-phase workflow.
> Ralph-dev 是一个**自主端到端开发系统**，通过 5 阶段工作流将自然语言需求转换为生产就绪的测试代码。

**Key Characteristics:**
- **State-Driven**: All progress persisted via CLI, survives context compression
- **TDD Enforcement**: Write failing tests first, then implement
- **Fresh Agent Context**: Each task uses isolated subagent
- **Self-Healing**: Automatic error recovery with circuit breaker
- **Multi-Language**: Supports TypeScript, Python, Go, Rust, Java, and more

---

## 2. System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RALPH-DEV SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│   │  Claude Code  │◄──►│  Plugin Layer │◄──►│  Skills Layer │              │
│   │    (Host)     │    │(.claude-plugin)│    │   (skills/)   │              │
│   └───────────────┘    └───────────────┘    └───────────────┘              │
│          │                     │                    │                       │
│          │                     │                    │                       │
│          ▼                     ▼                    ▼                       │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                    CLI Tool (cli/)                           │          │
│   │  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌────────────┐  │          │
│   │  │Commands │─►│ Services │─►│Repositories│─►│   Domain   │  │          │
│   │  └─────────┘  └──────────┘  └────────────┘  └────────────┘  │          │
│   │                                    │                         │          │
│   │                                    ▼                         │          │
│   │                           ┌────────────────┐                 │          │
│   │                           │ Infrastructure │                 │          │
│   │                           └────────────────┘                 │          │
│   └─────────────────────────────────────────────────────────────┘          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                  Workspace (.ralph-dev/)                     │          │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │          │
│   │  │state.json│  │  prd.md  │  │  tasks/  │  │  logs/   │    │          │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **Claude Code** | Host IDE | AI assistant runtime environment |
| **Plugin Layer** | `.claude-plugin/` | Session hooks, CLI bootstrap, marketplace metadata |
| **Skills Layer** | `skills/` | Phase-specific AI agent workflows |
| **CLI Tool** | `cli/` | State & task management, language detection |
| **Shared** | `shared/` | Bootstrap scripts, CLI fallback utilities |
| **Commands** | `commands/` | User-invocable slash commands |
| **Workspace** | `.ralph-dev/` | Runtime state, tasks, PRD, logs |

---

## 3. 5-Phase Workflow

### Workflow State Machine

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         RALPH-DEV WORKFLOW                                  │
└────────────────────────────────────────────────────────────────────────────┘

     ┌─────────┐      ┌───────────┐      ┌───────────┐      ┌─────────┐      ┌──────────┐
     │ CLARIFY │─────►│ BREAKDOWN │─────►│ IMPLEMENT │─────►│ DELIVER │─────►│ COMPLETE │
     └─────────┘      └───────────┘      └───────────┘      └─────────┘      └──────────┘
          │                │                   │ ▲               │
          │                │                   │ │               │
          ▼                ▼                   ▼ │               ▼
    ┌──────────┐     ┌──────────┐        ┌──────┴──┐      ┌──────────┐
    │ Generate │     │  Create  │        │  HEAL   │      │  Create  │
    │   PRD    │     │  Tasks   │        │ (retry) │      │   PR     │
    └──────────┘     └──────────┘        └─────────┘      └──────────┘
```

### Phase Details

| Phase | Skill | Input | Output | Interaction |
|-------|-------|-------|--------|-------------|
| **1. CLARIFY** | `phase-1-clarify` | User requirement | `.ralph-dev/prd.md` | Interactive (AskUserQuestion) |
| **2. BREAKDOWN** | `phase-2-breakdown` | `prd.md` | `.ralph-dev/tasks/*.md` | User approval required |
| **3. IMPLEMENT** | `phase-3-implement` | Task files | Working code + tests | Autonomous (fresh agents) |
| **4. HEAL** | `phase-4-heal` | Error context | Fixed code | On-demand (invoked by Phase 3) |
| **5. DELIVER** | `phase-5-deliver` | Completed code | Git commit + PR | Autonomous |

### State Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     VALID STATE TRANSITIONS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    clarify ──────────────► breakdown                                    │
│                                 │                                       │
│                                 ▼                                       │
│                            implement ◄───────────┐                      │
│                             │     │              │                      │
│                        error│     │all done      │                      │
│                             ▼     │              │                      │
│                           heal ───┘ (fixed)      │                      │
│                             │                    │                      │
│                             └─── (5 failures) ───┘                      │
│                                   (skip task)                           │
│                                                                         │
│                           implement ──────────► deliver                 │
│                                                    │                    │
│                                                    ▼                    │
│                                                complete                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. CLI Layered Architecture

### Layer Dependency Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLI LAYERED ARCHITECTURE                            │
│                         (cli/src/)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    COMMANDS LAYER                                │   │
│   │                    (commands/)                                   │   │
│   │                                                                  │   │
│   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │   │
│   │   │state.ts │ │tasks.ts │ │detect.ts│ │ init.ts │ │ status.ts│ │   │
│   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘ │   │
│   │   ┌────────────────┐ ┌────────────────┐                        │   │
│   │   │circuit-breaker │ │   detect-ai    │                        │   │
│   │   └────────────────┘ └────────────────┘                        │   │
│   │                                                                  │   │
│   │   Responsibility: Parse args, call services, format output       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │ uses                                     │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                   SERVICES LAYER                                 │   │
│   │                   (services/)                                    │   │
│   │                                                                  │   │
│   │   ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │   │
│   │   │  TaskService   │  │  StateService  │  │  StatusService  │   │   │
│   │   └────────────────┘  └────────────────┘  └─────────────────┘   │   │
│   │   ┌────────────────────┐  ┌────────────────────┐                │   │
│   │   │  DetectionService  │  │   ContextService   │                │   │
│   │   └────────────────────┘  └────────────────────┘                │   │
│   │                                                                  │   │
│   │   Responsibility: Business logic, validation, orchestration      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │ uses                                     │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                 REPOSITORIES LAYER                               │   │
│   │                 (repositories/)                                  │   │
│   │                                                                  │   │
│   │   ┌─────────────────────┐  ┌─────────────────────┐              │   │
│   │   │  ITaskRepository    │  │  IStateRepository   │              │   │
│   │   │         │           │  │         │           │              │   │
│   │   │         ▼           │  │         ▼           │              │   │
│   │   │  FileSystemTask     │  │  FileSystemState    │              │   │
│   │   │  Repository.service │  │  Repository.service │              │   │
│   │   └─────────────────────┘  └─────────────────────┘              │   │
│   │   ┌─────────────────────┐                                       │   │
│   │   │  IIndexRepository   │                                       │   │
│   │   │         │           │                                       │   │
│   │   │         ▼           │                                       │   │
│   │   │  FileSystemIndex    │                                       │   │
│   │   │  Repository.service │                                       │   │
│   │   └─────────────────────┘                                       │   │
│   │                                                                  │   │
│   │   Responsibility: Data access abstraction                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │ uses                                     │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    DOMAIN LAYER                                  │   │
│   │                    (domain/)                                     │   │
│   │                                                                  │   │
│   │   ┌──────────────────────┐  ┌──────────────────────┐            │   │
│   │   │ State (Entity)       │  │ Task (Entity)        │            │   │
│   │   │ - phase transitions  │  │ - status lifecycle   │            │   │
│   │   │ - canTransitionTo()  │  │ - isBlocked()        │            │   │
│   │   │ - getNextAllowed()   │  │ - start()/done()     │            │   │
│   │   └──────────────────────┘  └──────────────────────┘            │   │
│   │   ┌──────────────────────┐                                      │   │
│   │   │ LanguageConfig       │                                      │   │
│   │   │ - verifyCommands     │                                      │   │
│   │   └──────────────────────┘                                      │   │
│   │                                                                  │   │
│   │   Responsibility: Business rules, invariants, behaviors          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                              │ uses                                     │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                 INFRASTRUCTURE LAYER                             │   │
│   │                 (infrastructure/)                                │   │
│   │                                                                  │   │
│   │   ┌──────────────────────────┐  ┌────────────────────────────┐  │   │
│   │   │ IFileSystem              │  │ ILogger                    │  │   │
│   │   │        │                 │  │        │                   │  │   │
│   │   │        ▼                 │  │        ▼                   │  │   │
│   │   │ FileSystemService        │  │ ConsoleLogger              │  │   │
│   │   │ - readFile/writeFile     │  │ - debug/info/warn/error    │  │   │
│   │   │ - ensureDir/remove       │  │                            │  │   │
│   │   └──────────────────────────┘  └────────────────────────────┘  │   │
│   │                                                                  │   │
│   │   Responsibility: File I/O, logging, external systems            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    CORE UTILITIES                                │   │
│   │                    (core/)                                       │   │
│   │                                                                  │   │
│   │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │   │
│   │   │ task-parser │ │ task-writer │ │ exit-codes  │               │   │
│   │   └─────────────┘ └─────────────┘ └─────────────┘               │   │
│   │   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐       │   │
│   │   │ circuit-breaker │ │ response-wrapper│ │    retry    │       │   │
│   │   └─────────────────┘ └─────────────────┘ └─────────────┘       │   │
│   │   ┌───────────────┐ ┌───────────────────┐ ┌─────────────┐       │   │
│   │   │ error-handler │ │ structured-output │ │   ci-mode   │       │   │
│   │   └───────────────┘ └───────────────────┘ └─────────────┘       │   │
│   │                                                                  │   │
│   │   Responsibility: Parsing, error handling, cross-cutting utils   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dependency Injection (service-factory.ts)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY INJECTION                                 │
│                    (service-factory.ts)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   createServices(workspaceDir)                                          │
│       │                                                                 │
│       ▼                                                                 │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │                                                                │    │
│   │   ConsoleLogger ────────────────────────────────────┐          │    │
│   │   FileSystemService ───────────────────────────┐    │          │    │
│   │         │                                      │    │          │    │
│   │         ▼                                      │    │          │    │
│   │   FileSystemTaskRepository ─────────────┐      │    │          │    │
│   │   FileSystemStateRepository ────────┐   │      │    │          │    │
│   │   FileSystemIndexRepository ────┐   │   │      │    │          │    │
│   │                                 │   │   │      │    │          │    │
│   │                                 ▼   ▼   ▼      ▼    ▼          │    │
│   │                             ┌─────────────────────────┐        │    │
│   │                             │    ServiceContainer     │        │    │
│   │                             │  - taskService          │        │    │
│   │                             │  - stateService         │        │    │
│   │                             │  - statusService        │        │    │
│   │                             │  - detectionService     │        │    │
│   │                             │  - logger               │        │    │
│   │                             └─────────────────────────┘        │    │
│   │                                                                │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│   Also provides convenience functions:                                  │
│   - createTaskService(workspaceDir)                                     │
│   - createStateService(workspaceDir)                                    │
│   - createStatusService(workspaceDir)                                   │
│   - createDetectionService(workspaceDir)                                │
│   - createContextService(workspaceDir)                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Architecture Rules

| Layer | DO | DON'T |
|-------|-----|-------|
| **Commands** | Parse args, call services, format output | Put business logic, access file system |
| **Services** | Business logic, coordinate repos | Create own dependencies |
| **Repositories** | Data persistence, maintain index.json | Expose file paths to services |
| **Domain** | Behavior methods, enforce invariants | Just be data bags |
| **Infrastructure** | File I/O, logging, retry logic | Contain business rules |

---

## 5. Skills System

### Skill Structure

Each skill is defined in a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: phase-1-clarify
description: Interactive requirement clarification
allowed-tools: [Task, Read, Write, Bash]
user-invocable: true
---

# Skill Content (Markdown)
Execution instructions...
```

### Available Skills

| Skill | Directory | Purpose |
|-------|-----------|---------|
| `dev-orchestrator` | `skills/dev-orchestrator/` | Main orchestrator, manages entire workflow |
| `phase-1-clarify` | `skills/phase-1-clarify/` | Interactive requirement gathering |
| `phase-2-breakdown` | `skills/phase-2-breakdown/` | Task decomposition from PRD |
| `phase-3-implement` | `skills/phase-3-implement/` | TDD implementation loop |
| `phase-4-heal` | `skills/phase-4-heal/` | Error recovery and auto-fix |
| `phase-5-deliver` | `skills/phase-5-deliver/` | Quality gates, commit, PR |
| `detect-language` | `skills/detect-language/` | Project language detection |

### Skill Invocation Chain

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SKILL INVOCATION CHAIN                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   User: /ralph-dev                                                      │
│         │                                                               │
│         ▼                                                               │
│   ┌─────────────────────────────────────┐                               │
│   │ dev-orchestrator/SKILL.md           │                               │
│   │                                     │                               │
│   │   Check phase: ralph-dev state get  │                               │
│   └─────────────────────────────────────┘                               │
│         │                                                               │
│         │ Dispatches based on current phase                             │
│         ▼                                                               │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│   │ phase-1-clarify │──►│ phase-2-breakdown│──►│ phase-3-implement│      │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘       │
│                                                      │                   │
│                                                      │ on error          │
│                                                      ▼                   │
│                                               ┌─────────────────┐        │
│                                               │  phase-4-heal   │        │
│                                               └─────────────────┘        │
│                                                      │                   │
│                                                      │ all done          │
│                                                      ▼                   │
│                                               ┌─────────────────┐        │
│                                               │ phase-5-deliver │        │
│                                               └─────────────────┘        │
│                                                      │                   │
│                                                      ▼                   │
│                                               ┌─────────────────┐        │
│                                               │    COMPLETE     │        │
│                                               └─────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Plugin Infrastructure

### Plugin Configuration

**`.claude-plugin/plugin.json`:**

```json
{
  "name": "ralph-dev",
  "version": "0.1.0",
  "description": "Autonomous end-to-end development system",
  "hooks": {
    "SessionStart": [...],
    "PreCompact": [...]
  }
}
```

### Session Hooks

| Hook | Script | Purpose |
|------|--------|---------|
| `SessionStart` | `hooks/session-start.sh` | Build CLI, validate environment |
| `PreCompact` | `hooks/pre-compact.sh` | Save state before context compression |

### Bootstrap System (`shared/`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLI BOOTSTRAP SEQUENCE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SessionStart Hook                                                     │
│         │                                                               │
│         ▼                                                               │
│   ┌─────────────────────────────────────┐                               │
│   │ shared/bootstrap-cli.sh             │                               │
│   │                                     │                               │
│   │   1. Check if cli/dist exists       │                               │
│   │   2. If not: npm install && build   │                               │
│   │   3. Verify ralph-dev command works │                               │
│   └─────────────────────────────────────┘                               │
│         │                                                               │
│         │ CLI ready (or fallback to cli-fallback.sh)                    │
│         ▼                                                               │
│   ┌─────────────────────────────────────┐                               │
│   │ ralph-dev available in PATH         │                               │
│   └─────────────────────────────────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Flow

### Phase 1-2: Clarify to Breakdown

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLARIFY → BREAKDOWN DATA FLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   USER                                                                  │
│     │                                                                   │
│     │ "Build a user auth system"                                        │
│     ▼                                                                   │
│   ┌─────────────────┐                                                   │
│   │ Phase 1 Skill   │                                                   │
│   │ (clarify)       │                                                   │
│   └─────────────────┘                                                   │
│     │                                                                   │
│     │ AskUserQuestion (3-5 questions)                                   │
│     ▼                                                                   │
│   ┌─────────────────┐                                                   │
│   │ Generate PRD    │──────► .ralph-dev/prd.md                          │
│   └─────────────────┘                                                   │
│     │                                                                   │
│     │ ralph-dev state set --phase breakdown                             │
│     ▼                                                                   │
│   ┌─────────────────┐                                                   │
│   │ Phase 2 Skill   │                                                   │
│   │ (breakdown)     │                                                   │
│   └─────────────────┘                                                   │
│     │                                                                   │
│     │ ralph-dev tasks create <id> ...                                   │
│     ▼                                                                   │
│   ┌───────────────────────────────────────────┐                         │
│   │ .ralph-dev/tasks/                         │                         │
│   │ ├── auth/                                 │                         │
│   │ │   ├── auth.login.md                     │                         │
│   │ │   └── auth.signup.md                    │                         │
│   │ └── index.json                            │                         │
│   └───────────────────────────────────────────┘                         │
│     │                                                                   │
│     │ AskUserQuestion (approval)                                        │
│     │ ralph-dev state set --phase implement                             │
│     ▼                                                                   │
│   ┌─────────────────┐                                                   │
│   │ state.json      │                                                   │
│   │ {phase:         │                                                   │
│   │  "implement"}   │                                                   │
│   └─────────────────┘                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3-4: Implement with Healing

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENT ⇄ HEAL DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ IMPLEMENTATION LOOP (Phase 3)                                    │   │
│   │                                                                  │   │
│   │   ralph-dev tasks next --json                                    │   │
│   │          │                                                       │   │
│   │          │ {task: {id: "auth.login", ...}}                       │   │
│   │          ▼                                                       │   │
│   │   ralph-dev tasks start <id>                                     │   │
│   │          │                                                       │   │
│   │          ▼                                                       │   │
│   │   ┌───────────────────────────────────────────────────────┐      │   │
│   │   │ FRESH SUBAGENT (Task tool)                            │      │   │
│   │   │                                                       │      │   │
│   │   │   1. Read task file                                   │      │   │
│   │   │   2. Write failing tests (TDD)                        │      │   │
│   │   │   3. Implement minimal code                           │      │   │
│   │   │   4. Run tests: CI=true npm test                      │      │   │
│   │   └───────────────────────────────────────────────────────┘      │   │
│   │          │                                                       │   │
│   │          ▼                                                       │   │
│   │   ┌──────┴──────┐                                                │   │
│   │   │  Success?   │                                                │   │
│   │   └──────┬──────┘                                                │   │
│   │      yes │ no                                                    │   │
│   │          │  │                                                    │   │
│   │          ▼  ▼                                                    │   │
│   │   ┌─────────┐ ┌─────────────────────────────────────────┐        │   │
│   │   │ tasks   │ │ HEALING FLOW (Phase 4)                  │        │   │
│   │   │ done    │ │                                         │        │   │
│   │   │ <id>    │ │   1. INVESTIGATE - Read error output    │        │   │
│   │   └─────────┘ │   2. ANALYZE - Find working examples    │        │   │
│   │       │       │   3. HYPOTHESIS - Classify error type   │        │   │
│   │       │       │   4. FIX - Apply fix, verify (max 3x)   │        │   │
│   │       │       │                                         │        │   │
│   │       │       │   Circuit Breaker: 5 failures → skip    │        │   │
│   │       │       └─────────────────────────────────────────┘        │   │
│   │       │                     │                                    │   │
│   │       │                     │ fixed / skip                       │   │
│   │       └─────────────────────┴────────────────────────────────┐   │   │
│   │                                                              │   │   │
│   │                              ◄────────────────────────────────┘   │   │
│   │                                                                  │   │
│   │   Exit: ralph-dev tasks next → null (no more tasks)              │   │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Task Lifecycle State Machine

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TASK LIFECYCLE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                     ┌─────────────┐                                     │
│                     │   PENDING   │◄──────────── [created]              │
│                     └─────────────┘                                     │
│                            │                                            │
│                            │ ralph-dev tasks start <id>                 │
│                            ▼                                            │
│                     ┌─────────────┐                                     │
│                     │ IN_PROGRESS │                                     │
│                     └─────────────┘                                     │
│                       │         │                                       │
│           tasks done  │         │  tasks fail --reason                  │
│                       ▼         ▼                                       │
│               ┌───────────┐  ┌──────────┐                               │
│               │ COMPLETED │  │  FAILED  │                               │
│               └───────────┘  └──────────┘                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Directory Structure

```
ralph-dev/
│
├── .claude-plugin/                    # PLUGIN LAYER
│   ├── plugin.json                    # Plugin metadata & hooks config
│   ├── marketplace.json               # Marketplace listing
│   └── hooks/
│       ├── session-start.sh           # Build CLI on session start
│       └── pre-compact.sh             # Save state before compression
│
├── cli/                               # CLI TOOL (TypeScript)
│   ├── src/
│   │   ├── commands/                  # [Layer 1: Commands]
│   │   │   ├── state.ts               # State management commands
│   │   │   ├── tasks.ts               # Task management commands
│   │   │   ├── detect.ts              # Language detection
│   │   │   ├── detect-ai.ts           # AI-specific detection
│   │   │   ├── init.ts                # Initialize workspace
│   │   │   ├── status.ts              # Status summary
│   │   │   ├── circuit-breaker.ts     # Circuit breaker commands
│   │   │   └── service-factory.ts     # Dependency injection
│   │   │
│   │   ├── services/                  # [Layer 2: Services]
│   │   │   ├── task-service.ts        # Task lifecycle management
│   │   │   ├── state-service.ts       # State transitions
│   │   │   ├── status-service.ts      # Progress aggregation
│   │   │   ├── detection-service.ts   # Language detection logic
│   │   │   └── context-service.ts     # Context gathering
│   │   │
│   │   ├── repositories/              # [Layer 3: Repositories]
│   │   │   ├── task-repository.ts     # Interface
│   │   │   ├── task-repository.service.ts
│   │   │   ├── state-repository.ts    # Interface
│   │   │   ├── state-repository.service.ts
│   │   │   ├── index-repository.ts    # Interface
│   │   │   └── index-repository.service.ts
│   │   │
│   │   ├── domain/                    # [Layer 4: Domain]
│   │   │   ├── state-entity.ts        # State with transitions
│   │   │   ├── task-entity.ts         # Task with lifecycle
│   │   │   └── language-config.ts     # Language configuration
│   │   │
│   │   ├── infrastructure/            # [Layer 5: Infrastructure]
│   │   │   ├── file-system.ts         # Interface
│   │   │   ├── file-system.service.ts # Implementation
│   │   │   ├── logger.ts              # Interface
│   │   │   └── logger.service.ts      # ConsoleLogger
│   │   │
│   │   ├── core/                      # Utilities
│   │   │   ├── task-parser.ts         # YAML frontmatter parser
│   │   │   ├── task-writer.ts         # Task file writer
│   │   │   ├── exit-codes.ts          # Standard exit codes
│   │   │   ├── response-wrapper.ts    # JSON/human output
│   │   │   ├── error-handler.ts       # Structured errors
│   │   │   ├── structured-output.ts   # Output formatting
│   │   │   ├── circuit-breaker.ts     # Circuit breaker pattern
│   │   │   ├── retry.ts               # Retry with backoff
│   │   │   └── ci-mode.ts             # CI environment detection
│   │   │
│   │   ├── language/                  # Language Detection
│   │   │   └── detector.ts            # Multi-language detector
│   │   │
│   │   ├── test-utils/                # Test Mocks
│   │   │   ├── mock-logger.ts
│   │   │   ├── mock-file-system.ts
│   │   │   ├── mock-task-repository.ts
│   │   │   ├── mock-state-repository.ts
│   │   │   └── test-data.ts
│   │   │
│   │   └── index.ts                   # CLI entry point
│   │
│   ├── package.json
│   └── dist/                          # Compiled output
│
├── skills/                            # AI AGENT WORKFLOWS
│   ├── dev-orchestrator/
│   │   └── SKILL.md                   # Main orchestrator
│   ├── phase-1-clarify/
│   │   └── SKILL.md                   # Requirement clarification
│   ├── phase-2-breakdown/
│   │   └── SKILL.md                   # Task decomposition
│   ├── phase-3-implement/
│   │   ├── SKILL.md                   # Implementation loop
│   │   └── implementer-prompt-v2.md   # Subagent template
│   ├── phase-4-heal/
│   │   └── SKILL.md                   # Error recovery
│   ├── phase-5-deliver/
│   │   └── SKILL.md                   # Quality gates & PR
│   └── detect-language/
│       └── SKILL.md                   # Language detection
│
├── shared/                            # SHARED UTILITIES
│   ├── bootstrap-cli.sh               # CLI bootstrap script
│   ├── cli-fallback.sh                # Bash fallback
│   ├── test-bootstrap.sh              # Bootstrap tests
│   └── README.md
│
├── commands/                          # USER COMMANDS
│   └── ralph-dev.md                   # /ralph-dev command
│
├── .ralph-dev/                        # WORKSPACE (runtime, gitignored)
│   ├── state.json                     # Current phase & progress
│   ├── prd.md                         # Product requirements
│   ├── language.json                  # Detected language config
│   └── tasks/
│       ├── index.json                 # Task metadata index
│       └── {module}/{id}.md           # Individual task files
│
├── .claude/
│   └── rules/                         # Workflow documentation
│       ├── ralph-dev-workflow.md
│       ├── ralph-dev-principles.md
│       └── ralph-dev-commands.md
│
├── docs/                              # Documentation
│   ├── ARCHITECTURE.md                # This file
│   ├── CONFIGURATION.md
│   ├── QUICK_START_V0.3.md
│   ├── CRITICAL_FEATURES.md
│   └── ralph-dev-guide.md
│
├── CLAUDE.md                          # Project instructions
└── package.json                       # Root package
```

---

## 9. Error Handling & Recovery

### Circuit Breaker Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CIRCUIT BREAKER STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌──────────┐                                    │
│                         │  CLOSED  │◄─────────────────┐                 │
│                         │ (normal) │                  │                 │
│                         └──────────┘                  │                 │
│                              │                        │                 │
│                              │ 5 consecutive          │ success         │
│                              │ failures               │                 │
│                              ▼                        │                 │
│                         ┌──────────┐                  │                 │
│                         │   OPEN   │                  │                 │
│                         │(fail-fast)│                 │                 │
│                         └──────────┘                  │                 │
│                              │                        │                 │
│                              │ after 60s              │                 │
│                              ▼                        │                 │
│                         ┌──────────┐                  │                 │
│                         │HALF-OPEN │──────────────────┘                 │
│                         │ (probe)  │                                    │
│                         └──────────┘                                    │
│                              │                                          │
│                              │ failure → back to OPEN                   │
│                              ▼                                          │
│                                                                         │
│   Configuration: maxFailures=5, timeout=60s                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Retry with Exponential Backoff

```
Attempt 1 → fail → wait 100ms
Attempt 2 → fail → wait 200ms
Attempt 3 → fail → throw Error

Configuration:
- maxAttempts: 3
- initialDelay: 100ms
- maxDelay: 1000ms
- backoffMultiplier: 2
```

### Exit Codes

| Code | Name | Description |
|------|------|-------------|
| 0 | `SUCCESS` | Operation completed successfully |
| 1 | `GENERAL_ERROR` | Unexpected error |
| 2 | `NOT_FOUND` | Resource not found (task, state) |
| 3 | `INVALID_INPUT` | Bad arguments, validation failed |
| 4 | `CONFLICT` | Duplicate ID, invalid transition |
| 5 | `SYSTEM_ERROR` | File system error |

### Context Compression Recovery

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONTEXT COMPRESSION RECOVERY                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. PreCompact hook saves state                                        │
│   2. Context compressed                                                 │
│   3. Session resumes with fresh context                                 │
│   4. Recovery sequence:                                                 │
│                                                                         │
│      ralph-dev state get --json                                         │
│      → {phase: "implement", currentTask: "auth.2fa"}                    │
│                                                                         │
│      ralph-dev tasks list --json                                        │
│      → {completed: 5, pending: 3, failed: 1}                            │
│                                                                         │
│      ralph-dev tasks next --json                                        │
│      → {task: {id: "auth.2fa"}}                                         │
│                                                                         │
│   5. Resume appropriate phase skill                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Technology Stack

| Layer | Technology |
|-------|------------|
| **CLI** | TypeScript 5.3+, Commander.js |
| **Validation** | Zod schemas |
| **Serialization** | YAML (tasks), JSON (state, index) |
| **Testing** | Vitest |
| **File I/O** | fs-extra |
| **Terminal** | Chalk (colors) |
| **Runtime** | Node.js 18+ |
| **Skills** | Markdown with YAML frontmatter |
| **Plugin** | Claude Code Plugin API |

---

## Summary

Ralph-dev is a **state-driven, context-compression resilient** autonomous development system that:

1. **Transforms requirements** through 5 phases: Clarify → Breakdown → Implement ⇄ Heal → Deliver
2. **Persists all state** via CLI to survive context compression
3. **Implements with TDD** using fresh subagents per task
4. **Recovers from errors** with healing skill and circuit breakers
5. **Delivers quality code** through automated gates and PR creation

The architecture enforces strict separation of concerns through layered CLI design and skill-based AI workflows, enabling reliable autonomous development from natural language to production-ready code.
> Ralph-dev 是一个**状态驱动、上下文压缩弹性**的自主开发系统。

---

*Last Updated: 2026-01-20*
