# Ralph-dev

[English](README.md) | [中文](README_ZH.md)

Autonomous development system for Claude Code that transforms requirements into production-ready code.

[![npm version](https://img.shields.io/npm/v/ralph-dev.svg)](https://www.npmjs.com/package/ralph-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

```bash
# Add marketplace
/plugin marketplace add mylukin/ralph-dev

# Install plugin
/plugin install ralph-dev

# Run your first task
/ralph-dev "Build a REST API for user authentication"
```

That's it! Ralph-dev will:
1. Ask clarifying questions (answer A/B/C/D)
2. Generate task breakdown (review & approve)
3. Implement with TDD (watch progress)
4. Create PR automatically (review & merge)

## Key Features

- **Interactive Clarification** - Structured questions eliminate ambiguity
- **Autonomous Breakdown** - Decomposes into atomic tasks (<30min each)
- **Self-Healing** - Auto-fixes errors using WebSearch (86% success rate)
- **TDD Enforcement** - Tests first, no exceptions
- **Two-Stage Review** - Spec compliance + code quality
- **Universal Language** - Auto-detects ANY programming language
- **Auto Delivery** - Creates commits and PRs

## How It Works

```
Phase 1: CLARIFY   → Phase 2: BREAKDOWN → Phase 3: IMPLEMENT
Phase 4: HEAL      → Phase 5: DELIVER
```

**Example task:** "Add password reset functionality"

**Phase 1** (1-2 min): Asks about reset method, token expiration, etc.

**Phase 2** (30 sec): Generates 5 atomic tasks with estimates

**Phase 3** (auto): Implements each task with TDD
```
✅ auth.password-reset.api completed (1/5)
   Duration: 23m 15s | Tests: 12/12 ✓ | Coverage: 92%
```

**Phase 4** (auto, if needed): Auto-heals errors via WebSearch

**Phase 5** (auto): Runs quality gates and creates PR

## Installation

### Prerequisites
- Claude Code (latest)
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git repository

### Method 1: Via Marketplace (Recommended)
```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
```

### Method 2: Direct GitHub
```
/plugin install mylukin/ralph-dev
```

### Method 3: Local Development
```bash
git clone https://github.com/mylukin/ralph-dev.git
cd ralph-dev
ln -s $(pwd) ~/.claude/plugins/ralph-dev
```

**Note:** CLI auto-builds on first use (~15-30 seconds).

## Usage Examples

**New Feature:**
```
/ralph-dev "Add real-time notifications using WebSockets"
```

**Bug Fix:**
```
/ralph-dev "Fix: Users can bypass email verification by direct API calls"
```

**Refactoring:**
```
/ralph-dev "Refactor authentication middleware to use decorator pattern"
```

## Architecture

```
ralph-dev/
├── cli/              # TypeScript CLI (state, tasks, detect)
├── skills/           # 5 phase skills + orchestrator
├── commands/         # /ralph-dev command
├── agents/           # Language detector
└── .claude-plugin/   # Plugin config
```

**Workspace structure:**
```
your-project/
└── .ralph-dev/
    ├── state.json
    ├── prd.md
    └── tasks/
```

## Troubleshooting

**Marketplace not found:**
```
/plugin install mylukin/ralph-dev  # Direct install
```

**Plugin not loading:**
```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/clear
```

**CLI build fails:**
```bash
node --version  # Check >= 18.0.0
npm --version   # Check >= 9.0.0
cd ~/.claude/plugins/ralph-dev/cli && npm install && npm run build
```

## Contributing

- **Bugs**: [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- **Features**: [GitHub Discussions](https://github.com/mylukin/ralph-dev/discussions)
- **PRs**: Fork → feature branch → tests → semantic commits → PR

## License

MIT - see [LICENSE](LICENSE)

## Support

- 📖 [Skill Documentation](/skills)
- 🐛 [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- 💬 [Discussions](https://github.com/mylukin/ralph-dev/discussions)
- 🌐 [Repository](https://github.com/mylukin/ralph-dev)

---

**Ready to start?**

```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/ralph-dev "Your task here"
```
