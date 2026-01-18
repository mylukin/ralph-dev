# PRD and Progress Improvements

## Summary | 总结

Based on user feedback, we've made two critical improvements:

> 基于用户反馈，我们做了两个关键改进：

1. **PRD is now Markdown-first** (human-readable, Git-friendly)
2. **Progress is minimal** (details in git commits, not redundant logs)

---

## ✅ Improvement 1: Markdown PRD (Human-First)

### Before (prd.json only) | 之前（仅 JSON）

```json
{
  "stories": [
    {
      "id": "auth.signup.ui",
      "epic": "auth",
      "priority": 3,
      "description": "Create signup form component",
      "estimatedMinutes": 20,
      "status": "pending",
      "passes": false,
      "notes": "",
      "acceptanceCriteria": [
        "Component exists at src/components/SignupForm.tsx",
        "Form has email, password, confirmPassword fields",
        ...
      ]
    }
  ]
}
```

**Problems:**
- ❌ Hard to read for humans
- ❌ Difficult to edit manually
- ❌ Not Git-diff friendly
- ❌ No Markdown formatting (links, code blocks, etc.)

### After (prd.md primary) | 之后（Markdown 为主）

**File:** `.autopilot/prd.md`

```markdown
### Epic: Authentication

#### 3. 📋 auth.signup.ui (P3, 20min)
Create signup form component.

**Acceptance Criteria:**
- [ ] Component exists at src/components/SignupForm.tsx
- [ ] Form has email, password, confirmPassword fields
- [ ] Form validates email format
- [ ] Submit button disabled when form invalid
- [ ] Unit tests exist and pass (coverage >80%)

**Status:** 📋 PENDING
**Notes:**
```

**Benefits:**
- ✅ Easy to read and edit
- ✅ Supports rich formatting
- ✅ Git-diff friendly
- ✅ Checkboxes for tracking acceptance criteria
- ✅ Human-friendly status icons (✅ 🔄 ⚠️ 📋)

**Companion File:** `.autopilot/prd.json` (minimal, machine-readable)

```json
{
  "version": "1.0.0",
  "updatedAt": "2026-01-18T...",
  "stories": [
    {
      "id": "auth.signup.ui",
      "priority": 3,
      "status": "pending",
      "passes": false
    }
  ]
}
```

**Purpose:** Quick status queries for CLI, not human reading.

---

## ✅ Improvement 2: Minimal Progress (Git-First)

### Before (progress.md - too detailed) | 之前（过于详细）

```markdown
## Task: auth.signup.ui (PASSED)

**Duration:** 4m 32s
**Status:** PASSED

**Approach:**
React Hook Form + Zod for validation. Created reusable form component...

**Tests:**
- Unit tests: 8 passed
- Coverage: 87%
- Pattern: tests/auth/SignupForm.test.tsx

**Key Learning:**
Zod schema reusable for API validation...

**Issues Encountered:**
None

**Files Created/Modified:**
- src/components/SignupForm.tsx
- src/schemas/auth.ts
- tests/auth/SignupForm.test.tsx
```

**Problems:**
- ❌ Redundant with git commits
- ❌ Too verbose for 35+ tasks
- ❌ Becomes unmanageable at scale
- ❌ Duplicates information already in git history

### After (progress.txt - minimal) | 之后（最小化）

**File:** `.autopilot/progress.txt`

```
# Autopilot Progress

Session: 2026-01-18
Goal: Build task management app with authentication

## Tasks
DONE: setup.scaffold (3m47s)
DONE: auth.signup.ui (4m32s)
HEAL: auth.signup.api (6m12s) - bcrypt dependency
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
For details, see git log.
```

**Benefits:**
- ✅ One-page overview
- ✅ Scales to 100+ tasks
- ✅ Points to git for details
- ✅ Updated automatically

**Where are the details?** → In git commits!

---

## 🎯 Detailed Information Lives in Git Commits

### Example Commit Message (Single Task)

```
feat(auth): create signup form component

Task: auth.signup.ui
Duration: 4m 32s
Tests: 8 passed, 87% coverage

Acceptance criteria:
- Component exists at src/components/SignupForm.tsx
- Form has email, password, confirmPassword fields
- Form validates email format
- Form validates password strength
- Submit button disabled when form invalid
- Unit tests exist and pass

Files:
- src/components/SignupForm.tsx
- src/schemas/auth.ts
- tests/auth/SignupForm.test.tsx

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Viewing Progress:**

```bash
# See all completed tasks
git log --oneline

# See details of specific task
git show a3f2b1c

# Search for specific task
git log --grep="auth.signup.ui"

# See all tasks in module
git log --grep="feat(auth)"
```

**Benefits:**
- ✅ Git is the single source of truth
- ✅ Built-in versioning and history
- ✅ No redundant files
- ✅ Standard developer workflow

---

## 📁 Updated File Structure

```
.autopilot/
├── prd.md              # PRIMARY - Human-readable PRD (Markdown)
├── prd.json            # SECONDARY - Machine-readable status (minimal)
├── progress.txt        # MINIMAL - One-page progress overview
└── tasks/              # Task files (unchanged)
    ├── index.json
    ├── auth/
    │   ├── signup.ui.md
    │   └── signup.api.md
    └── ...
```

**Priorities:**
1. **prd.md** - Edit this file manually when requirements change
2. **progress.txt** - Quick glance at progress, auto-updated
3. **git log** - Detailed history of what was done
4. **prd.json** - CLI reads this, rarely edited manually

---

## 🔄 Workflow Changes

### Creating PRD (Phase 2)

**Before:**
```bash
# Generate prd.json with all details
cat > .autopilot/prd.json <<EOF
{
  "stories": [...]
}
EOF
```

**After:**
```bash
# Generate prd.md (human-readable)
cat > .autopilot/prd.md <<'EOF'
# Project Requirements Document

## User Stories

### Epic: Setup
#### 1. 📋 setup.scaffold (P1, 15min)
...
EOF

# Generate minimal prd.json for CLI
autopilot-cli prd init --from-md .autopilot/prd.md
```

### Completing Task (Phase 5)

**Before:**
```bash
# Write detailed progress to progress.md
cat >> .autopilot/progress.md <<EOF
## Task: auth.signup.ui (PASSED)
Duration: 4m 32s
...
EOF

# Also commit to git
git commit -m "feat: implement auth.signup.ui"
```

**After:**
```bash
# Detailed commit message (one source of truth)
git commit -m "$(cat <<EOF
feat(auth): create signup form component

Task: auth.signup.ui
Duration: 4m 32s
Tests: 8 passed, 87% coverage
...
EOF
)"

# Minimal progress update
echo "DONE: auth.signup.ui (4m32s) - $(git rev-parse --short HEAD)" >> .autopilot/progress.txt
```

---

## 📊 Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **PRD Format** | JSON only | Markdown primary, JSON secondary |
| **Human Readability** | ❌ Poor | ✅ Excellent |
| **Progress Detail** | 📝 Separate file | 💾 Git commits |
| **Scalability** | ❌ Bloated at 35+ tasks | ✅ Scales to 100+ |
| **Single Source of Truth** | ❌ Duplicated | ✅ Git history |
| **Developer Experience** | ❌ Unfamiliar | ✅ Standard workflow |

---

## 🎯 Why This Is Better

### 1. PRD as Markdown

**User Feedback:** "prd.json 看起来不怎么样"

**Solution:**
- Markdown is the standard for documentation
- Easier to read, edit, and version control
- Supports rich formatting (tables, code blocks, links)
- Familiar to all developers

### 2. Progress in Git Commits

**User Feedback:** "任务记录应该记录到 git commit 里"

**Solution:**
- Git already tracks what, when, who, and why
- No need to duplicate this information
- `git log` is searchable, filterable, and standard
- Reduces cognitive load (one less file to maintain)

### 3. Minimal Progress File

**User Feedback:** "任务非常多的时候，根本没办法使用"

**Solution:**
- Single-page overview that scales
- High-level stats only
- Points to git for details
- Auto-updated, no manual maintenance

---

## 📝 Migration Guide

If you have existing prd.json or progress.md files:

### Convert prd.json to prd.md

```bash
# Use this helper script
autopilot-cli prd convert --from-json prd.json --to-md prd.md
```

### Extract progress from old progress.md

```bash
# Old progress.md → git commits
autopilot-cli progress migrate --from progress.md
```

### Fresh Start (Recommended)

```bash
# Start with new templates
cp .autopilot/prd.md.template .autopilot/prd.md
cp .autopilot/progress.txt.template .autopilot/progress.txt

# Edit prd.md with your requirements
vim .autopilot/prd.md

# Generate prd.json from prd.md
autopilot-cli prd sync
```

---

## ✅ Summary

**Changes:**
1. ✅ PRD is now Markdown-first (prd.md primary, prd.json secondary)
2. ✅ Progress is minimal (progress.txt one-pager)
3. ✅ Details live in git commits (single source of truth)

**Benefits:**
- Better developer experience
- Scales to large projects
- Follows standard workflows
- Eliminates redundancy

**Files:**
- `.autopilot/prd.md.template` - New Markdown PRD template
- `.autopilot/prd.json.template` - Simplified JSON (minimal)
- `.autopilot/progress.txt.template` - Minimal progress (replaced progress.md)
- `skills/phase-5-deliver/SKILL.md` - Updated with detailed commit messages

---

**Thanks for the feedback! These improvements make Autopilot much more practical.** 🙏

> **感谢反馈！这些改进使 Autopilot 更加实用。** 🙏
