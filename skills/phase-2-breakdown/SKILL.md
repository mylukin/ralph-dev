---
name: phase-2-breakdown
description: Break down PRD into atomic, testable tasks using CLI for modular storage
allowed-tools: [Read, Write, Bash, AskUserQuestion]
user-invocable: false
---

# Phase 2: Task Breakdown

## Goal

Break down the PRD into atomic, testable tasks (each <30 minutes), create task files via CLI, and get user approval before implementation.

## Input

- PRD file: `.ralph-dev/prd.md`
- Language config from CLI (if available)

---

## Workflow

### Step 0: Initialize CLI (Automatic)

**IMPORTANT:** This skill requires the Ralph-dev CLI. It will build automatically on first use.

```bash
# Bootstrap CLI - runs automatically, builds if needed
source ${CLAUDE_PLUGIN_ROOT}/shared/bootstrap-cli.sh

# Verify CLI is ready
ralph-dev --version

# Context-compression resilience: Verify current phase
CURRENT_PHASE=$(ralph-dev state get --json 2>/dev/null | jq -r '.phase // "none"')
echo "Current phase: $CURRENT_PHASE"
# Expected: breakdown
```

### Step 1: Verify Prerequisites

```bash
# Ensure .ralph-dev is gitignored (add if missing)
git check-ignore -q .ralph-dev 2>/dev/null || {
  echo ".ralph-dev/" >> .gitignore
  git add .gitignore && git commit -m "chore: gitignore .ralph-dev temp files"
}

# Verify PRD exists
[ -f ".ralph-dev/prd.md" ] || { echo "ERROR: PRD not found"; exit 1; }
```

### Step 2: Read and Analyze PRD

Read `.ralph-dev/prd.md` and extract:
- User stories from each Epic
- Technical requirements
- Architecture components

### Step 3: Create Atomic Tasks

For each user story, create 1-3 tasks following these rules:

**Task Breakdown Rules:**
- Each task completable in <30 minutes
- Each task has clear, testable acceptance criteria
- Tasks follow dependency order
- Group related tasks into modules

**Task Naming Convention:** `{module}.{feature}.{aspect}`
- Example: `auth.signup.ui`, `auth.signup.api`, `auth.signup.tests`

### Step 4: Create Tasks via CLI (Sequential)

**CRITICAL:** Create tasks one at a time for context-compression resilience.

**CRITICAL — write the FULL enriched body, not just a description.** Every task
MUST carry the complete 8-section contract (see *Task File Format* below).
Author it into a temporary Markdown file and pass it with `--body-file`, so the
contract is preserved verbatim and reaches the implementer in Phase 3. A bare
`--description` task is the thin version the system must refuse to ship.

```bash
# Initialize tasks
ralph-dev tasks init --project-goal "..." --language "..."

# For each task: write the enriched 8-section body to a temp file …
BODY_FILE="$(mktemp -t ralph-task.XXXXXX.md)"
cat > "$BODY_FILE" <<'EOF'
# {Task Title}

## Context
{Why this task exists and where it fits in the system}

## Spec Basis
{Cite the PRD or design-doc clauses this task implements}

## Interface / Contract
{Inputs, outputs, type signatures, error returns}

## TDD
{The failing tests to write first and the cases to cover}

## Edge Cases & Failure Modes
{Boundary conditions, concurrency, errors, rollback}

## Files Touched
{Files to be created or modified}

## Definition of Done
{Verifiable definition-of-done checklist}

## Acceptance Criteria
1. {Testable criterion}
2. {Testable criterion}
EOF

# … then create the task with the body attached (one at a time, not batched)
ralph-dev tasks create \
  --id "{module}.{feature}" \
  --module "{module}" \
  --priority {N} \
  --estimated-minutes {M} \
  --description "{one-line summary}" \
  --criteria "Criterion 1" \
  --criteria "Criterion 2" \
  --body-file "$BODY_FILE" \
  --json

rm -f "$BODY_FILE"

# Verify creation
ralph-dev tasks list --json
```

> The `--criteria` flags still populate the indexed projection (used for quick
> listing). The `## Acceptance Criteria` section in the body should mirror them.

### Step 5: Show Task Plan for Approval

Display the task plan and ask for user approval:

```markdown
📋 Task Plan

**Total Tasks**: {N} tasks
**Estimated Time**: {X} hours

## Tasks by Module
### Module: {name} (Priority {range})
1. [P{n}] {task.id} - {description} ({minutes} min)
...
```

**Use AskUserQuestion tool:**
- Question: "Do you approve this task breakdown?"
- Options: "Yes, proceed", "Modify first", "Cancel"
- Add "(Recommended)" to suggested option based on task quality

### Step 6: Handle Response & Update State

```bash
case "$ANSWER" in
  "Yes, proceed"*)
    ralph-dev state update --phase implement
    ;;
  "Modify first"*)
    echo "Edit files in: .ralph-dev/tasks/"
    echo "Resume with: /ralph-dev resume"
    exit 0
    ;;
  "Cancel"*)
    ralph-dev state clear
    exit 1
    ;;
esac
```

### Step 7: Return Result

**REQUIRED Output Format:**
```yaml
---PHASE RESULT---
phase: breakdown
status: complete
tasks_created: {N}
tasks_dir: .ralph-dev/tasks
estimated_hours: {X}
next_phase: implement
---END PHASE RESULT---
```

---

## Task File Format

Tasks use an **8-section contract**. The frontmatter is managed by the CLI and
regenerated on every status change; the body below it is **author-owned and
preserved verbatim** — status transitions never wipe it.

```markdown
---
id: {module}.{task-name}
module: {module-name}
priority: {number}
status: pending
estimatedMinutes: {number}
dependencies: [{task-ids}]
---
# {Task Title}

## Context
{Why this task exists and where it fits in the system}

## Spec Basis
{Cite the PRD or design-doc clauses this task implements}

## Interface / Contract
{Inputs, outputs, type signatures, error returns}

## TDD
{The failing tests to write first and the cases to cover}

## Edge Cases & Failure Modes
{Boundary conditions, concurrency, errors, rollback}

## Files Touched
{Files to be created or modified}

## Definition of Done
{Verifiable definition-of-done checklist}

## Acceptance Criteria
1. {Testable criterion}
2. {Testable criterion}
```

**How it is persisted:** author this body into a temp file and pass it via
`ralph-dev tasks create --body-file <path>` (see Step 4). The CLI stores it
verbatim; `tasks start/done/fail` only rewrite the frontmatter, so the enriched
sections survive the full task lifecycle.

---

## Tool Constraints

### AskUserQuestion
- Max 4 questions per call
- `header`: ≤12 chars (e.g., "Approval")
- Add "(Recommended)" to suggested option

---

## Constraints

- **NEVER** create tasks >30 minutes
- **NEVER** batch task creation in memory (context-compression vulnerability)
- **ALWAYS** verify task creation via CLI after each create
- **ALWAYS** get user approval before transitioning to implement
- **ALWAYS** return structured PHASE RESULT block

---

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | Fail, prompt to run Phase 1 |
| Task creation fails | Retry once, then report error |
| User rejects plan | Save state, allow manual editing |
