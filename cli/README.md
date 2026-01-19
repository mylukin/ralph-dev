# Ralph-dev CLI

[中文](./README_ZH.md) | **English**

Efficient TypeScript CLI for Ralph-dev operations.

## Quick Start

```bash
cd cli && npm install && npm run build
npx ralph-dev <command>
```

## Core Commands

**Task Management**
```bash
ralph-dev tasks next --json          # Get next task
ralph-dev tasks done <id>            # Mark complete
ralph-dev tasks list --status pending
```

**State Management**
```bash
ralph-dev state get phase            # Read state
ralph-dev state set phase implement  # Update state
ralph-dev state show --json          # Full state
```

**Language Detection**
```bash
ralph-dev detect language            # Auto-detect project language
ralph-dev detect verify-commands     # Get test/build commands
```

**PRD Operations**
```bash
ralph-dev prd parse .ralph-dev/prd.md --json
ralph-dev prd generate-tasks <file> --output .ralph-dev/tasks/
```

**Verification**
```bash
ralph-dev verify                     # Run auto-detected checks
ralph-dev verify --language python   # Specify language
```

## Architecture

```
src/
├── commands/      # State, tasks, PRD, detect, verify
├── core/          # Task parser/writer, index manager
└── language/      # Language detection logic
```

## Usage in Skills

```bash
# Efficient task iteration
TASK=$(ralph-dev tasks next --json)
TASK_ID=$(echo $TASK | jq -r '.id')

# ... implement task ...

ralph-dev tasks done "$TASK_ID" --files "src/auth.ts"
```

See source code for implementation details.
