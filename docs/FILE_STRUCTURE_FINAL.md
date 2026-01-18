# Autopilot File Structure (Final)

## Overview | 概述

After user feedback, we simplified to **three essential files** with no redundancy.

> 根据用户反馈，我们简化为 **三个核心文件**，没有冗余。

---

## 📁 File Structure

```
workspace/ai/
├── prd.md              # Requirements (Markdown, human-readable)
├── progress.txt        # Progress overview (minimal, one-page)
└── tasks/
    ├── index.json      # Task status (machine-readable)
    ├── auth/
    │   ├── signup.ui.md
    │   └── signup.api.md
    └── ...
```

**That's it. Three files only.**

> **就这些。只有三个文件。**

---

## 📄 File Purposes

### 1. `prd.md` - Requirements (Markdown)

**Owner:** Human (developer/PM)
**Format:** Markdown
**Purpose:** Document project requirements and user stories

**Content:**
```markdown
# Project Requirements Document

## Project Overview
Build a task management app...

## User Stories

### Epic: Authentication
#### 1. ✅ auth.signup.ui (P1, 20min)
Create signup form component.

**Acceptance Criteria:**
- [x] Component exists
- [x] Form validates email
- [ ] Password strength indicator

**Status:** ✅ DONE
**Notes:** Used React Hook Form + Zod
```

**Why Markdown:**
- ✅ Human-readable
- ✅ Git-diff friendly
- ✅ Supports formatting (checkboxes, code blocks, links)
- ✅ Easy to edit in any editor
- ✅ Standard for documentation

**Updated by:**
- Phase 1 (Clarify): Initial creation
- Manually: When requirements change
- Phase 5 (Deliver): Status updates (✅ DONE, ⚠️ FAILED, etc.)

---

### 2. `tasks/index.json` - Task Status (JSON)

**Owner:** Autopilot CLI
**Format:** JSON
**Purpose:** Machine-readable task tracking

**Content:**
```json
{
  "version": "1.0.0",
  "updatedAt": "2026-01-18T10:30:00Z",
  "metadata": {
    "projectGoal": "Build task management app",
    "languageConfig": {
      "language": "typescript",
      "framework": "Next.js"
    }
  },
  "tasks": {
    "auth.signup.ui": {
      "status": "completed",
      "priority": 1,
      "module": "auth",
      "description": "Create signup form component",
      "filePath": "auth/signup.ui.md"
    },
    "auth.signup.api": {
      "status": "pending",
      "priority": 2,
      "module": "auth",
      "description": "Create signup API endpoint",
      "filePath": "auth/signup.api.md"
    }
  }
}
```

**Why JSON:**
- ✅ Fast CLI queries: `autopilot-cli tasks next`
- ✅ Type-safe operations
- ✅ Programmatic updates
- ✅ Already exists (from original design)

**Updated by:**
- `autopilot-cli tasks create` - Add new task
- `autopilot-cli tasks start <id>` - Mark in_progress
- `autopilot-cli tasks done <id>` - Mark completed
- `autopilot-cli tasks fail <id>` - Mark failed

---

### 3. `progress.txt` - Progress Overview (Plain Text)

**Owner:** Autopilot (auto-updated)
**Format:** Plain text
**Purpose:** Quick one-page progress summary

**Content:**
```
# Autopilot Progress

Session: 2026-01-18 10:00
Goal: Build task management app with authentication

## Tasks
DONE: setup.scaffold (3m47s) - commit a3f2b1c
DONE: auth.signup.ui (4m32s) - commit b4e3c2d
HEAL: auth.signup.api (6m12s) - commit c5f4d3e
PROG: auth.login.ui
TODO: auth.login.api
TODO: ... (30 more)

## Stats
Total: 35 | Done: 3 | Failed: 0 | Healed: 1 | Progress: 9%

## Key Learnings
- Next.js 14 needs "use client" for client components
- bcrypt auto-installs successfully
- Zod schemas reusable for API validation

## Next
Run: autopilot-cli tasks next

---
For details: git log --oneline
For specific task: git show b4e3c2d
```

**Why Plain Text:**
- ✅ One-page overview (scales to 100+ tasks)
- ✅ Human-scannable
- ✅ Auto-updated by Phase 5
- ✅ Points to git for details

**Updated by:**
- Phase 5 (Deliver): After each batch of tasks
- Auto-updates stats (Total, Done, Progress %)
- Appends new completed tasks with commit SHA

---

## 🚫 What We DON'T Have

### ❌ No prd.json

**Before:** Had both prd.md and prd.json

**Why removed:**
- Redundant with tasks/index.json
- Creates synchronization problem
- Adds complexity without benefit

**Alternative:**
```bash
# Want JSON status? Use index.json
autopilot-cli tasks list --json

# Or query tasks directly
cat workspace/ai/tasks/index.json | jq '.tasks'
```

### ❌ No progress.md

**Before:** Detailed progress.md with full task descriptions

**Why removed:**
- Too detailed (35+ tasks = unmanageable)
- Redundant with git commits
- Doesn't scale

**Alternative:**
```bash
# Want task details? Check git
git log --grep="auth.signup.ui"
git show b4e3c2d

# Want progress summary? Check progress.txt
cat workspace/ai/progress.txt
```

---

## 🔄 Information Flow

### Where Does Each Type of Information Live?

| Information | Primary Source | Secondary |
|-------------|---------------|-----------|
| **Requirements** | prd.md | - |
| **Task definitions** | tasks/{module}/{task}.md | - |
| **Task status** | tasks/index.json | prd.md (icons) |
| **Implementation details** | git commits | - |
| **Progress summary** | progress.txt | - |
| **Test results** | git commit messages | - |
| **Duration** | git commit messages | progress.txt (brief) |
| **Learnings** | progress.txt | prd.md (brief) |

**Single Source of Truth:**
- Requirements → prd.md
- Status → index.json
- Details → git log
- Summary → progress.txt

**No Duplication!**

---

## 📝 CLI Commands

### Query Status

```bash
# Next task to work on
autopilot-cli tasks next

# List all tasks
autopilot-cli tasks list

# List by status
autopilot-cli tasks list --status pending
autopilot-cli tasks list --status completed

# Get specific task
autopilot-cli tasks get auth.signup.ui

# JSON output for scripting
autopilot-cli tasks list --json | jq '.[] | select(.status=="pending")'
```

### Update Status

```bash
# Create task
autopilot-cli tasks create \
  --id auth.signup.ui \
  --module auth \
  --description "Create signup form"

# Start task
autopilot-cli tasks start auth.signup.ui

# Complete task
autopilot-cli tasks done auth.signup.ui --duration "4m 32s"

# Mark failed
autopilot-cli tasks fail auth.signup.ui --reason "Missing OAuth credentials"
```

### View Progress

```bash
# Quick summary
cat workspace/ai/progress.txt

# Task details
git log --grep="auth.signup.ui"

# All auth tasks
git log --grep="feat(auth)"

# Recent activity
git log --oneline -10
```

---

## 🎯 Design Principles

### 1. No Redundancy

**Before:** prd.json duplicated index.json, progress.md duplicated git log

**After:** Each piece of information has ONE authoritative source

### 2. Human + Machine Friendly

- **Human:** prd.md (Markdown), progress.txt (plain text)
- **Machine:** index.json (JSON for CLI)
- **Both:** git log (searchable, structured)

### 3. Scales to 100+ Tasks

- **prd.md:** Collapsed sections, checkboxes
- **index.json:** Efficient JSON queries
- **progress.txt:** One-page summary
- **git log:** Built-in pagination and search

### 4. Standard Tools

- **prd.md:** Any Markdown editor
- **index.json:** jq, JSON tools
- **progress.txt:** cat, grep, less
- **git log:** Standard git commands

---

## ✅ Summary

**Final file structure:**

```
workspace/ai/
├── prd.md           # Requirements (Markdown, human-editable)
├── progress.txt     # Progress summary (auto-updated)
└── tasks/
    ├── index.json   # Task status (CLI-managed)
    └── {module}/
        └── {task}.md
```

**Three files. No redundancy. Scales to any project size.**

> **三个文件。没有冗余。可扩展到任何项目规模。**

**Why this works:**
- ✅ prd.md: Standard Markdown documentation
- ✅ index.json: Fast CLI operations
- ✅ progress.txt: Quick overview
- ✅ git log: Detailed history (free, built-in)

**No prd.json. No progress.md. Just the essentials.**

> **没有 prd.json。没有 progress.md。只有核心要素。**
