# Changelog

All notable changes to the Autopilot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-18

### Changed - BREAKING CHANGE

- **BREAKING:** Workspace directory renamed from `ai/` to `.autopilot/`
  - Follows industry conventions (.git, .next, .vscode, .github)
  - Hidden by default (dot-prefix) to reduce visual clutter
  - Clear tool attribution when users discover the directory
  - Branded naming prevents conflicts with other AI tools

### Migration Guide

If you have an existing `ai/` directory from a previous autopilot session:

```bash
# Option 1: Migrate existing workspace
mv ai .autopilot

# Option 2: Start fresh (lose session progress)
rm -rf ai
# Next /autopilot run will create .autopilot/
```

### New .gitignore Pattern

- **Tracked files** (committed to git):
  - `.autopilot/prd.md` - Product Requirements Document
  - `.autopilot/tasks/**/*.md` - Task definitions (valuable documentation)

- **Ignored files** (not committed):
  - `.autopilot/state.json` - Runtime session state
  - `.autopilot/progress.log` - Progress audit trail
  - `.autopilot/debug.log` - Error recovery log
  - `.autopilot/tasks/index.json` - Machine-readable task index

This selective tracking enables:
- **Team collaboration**: PRD and tasks become shareable documentation
- **Resume on different machines**: Clone repo and continue work
- **Git history**: Track requirements and task evolution over time

### Implementation Details

- Updated 4 CLI source files (state.ts, tasks.ts, detect.ts, detect-ai.ts)
- Updated 7 skill files (all phases + orchestrator)
- Updated 18 documentation files
- Updated .gitignore with selective tracking pattern
- Created workspace/.autopilot/README.md explaining directory structure

### Credits

Based on comprehensive architectural review from software architecture, DevOps, and UX experts.

---

## [2.0.0] - 2026-01-18

### Added

- **Multi-language support** for 12 programming languages
  - TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, PHP, C#, Swift, Kotlin, Scala
- **AI-powered language detection** using language-detector agent
- **Hybrid architecture** combining skills (intelligence) + CLI (efficiency)
- **Modular task storage** with agent-foreman pattern
- **TDD enforcement** with Iron Law compliance
- **Two-stage code review** (spec compliance + code quality)
- **Self-healing error recovery** using WebSearch
- **5-phase autonomous workflow**:
  1. Clarify - Interactive requirements gathering
  2. Breakdown - Atomic task decomposition
  3. Implement - TDD loop with fresh agents
  4. Heal - Auto-fix errors on demand
  5. Deliver - Quality gates + commit + PR

### Initial Components

- CLI tool with task, state, and PRD management
- 7 core skills (orchestrator + 5 phases + detect-language)
- /autopilot command for user invocation
- Plugin configuration with marketplace metadata
- Comprehensive documentation

---

## Links

- [GitHub Repository](https://github.com/mylukin/autopilot)
- [Documentation](./README.md)
- [Architecture](./docs/ARCHITECTURE.md)
