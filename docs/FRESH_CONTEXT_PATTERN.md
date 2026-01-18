# Fresh Context Pattern with Ralph-Loop

## Overview | 概述

To prevent context pollution during implementation, Autopilot can use the ralph-loop plugin for fresh context per task.

> 为了防止实现过程中的上下文污染，Autopilot 可以使用 ralph-loop 插件为每个任务提供新上下文。

## Problem | 问题

Running all 15-35 tasks in one orchestrator context causes:
- Context pollution (task #30 has baggage from 29 previous tasks)
- Quality degradation over time
- Harder to reason about isolated tasks

> 在一个编排器上下文中运行所有 15-35 个任务会导致：
> - 上下文污染（任务 #30 携带了前 29 个任务的包袱）
> - 质量随时间下降
> - 更难对隔离的任务进行推理

## Solution: Ralph-Loop Integration | 解决方案：Ralph-Loop 集成

### Installation | 安装

```bash
# Install ralph-loop plugin
/plugin install ralph-loop@claude-plugins-official
```

### Usage in Phase 3 | 在第 3 阶段使用

**Instead of:** Running all tasks in orchestrator context

**Use:** Ralph-loop for per-task fresh context

```bash
# Modified Phase 3 execution in autopilot-orchestrator
/ralph-loop "Implement next pending task from .autopilot/tasks/ using TDD" \
  --max-iterations 35 \
  --completion-promise "autopilot-cli tasks list --status pending returns empty"
```

### How It Works | 工作原理

**Each iteration:**

1. **Start fresh** - Clean context, no baggage from previous tasks
2. **Load task** - Read next task from `autopilot-cli tasks next`
3. **Implement** - Follow TDD Iron Law from phase-3-implement
4. **Update state** - Mark task complete: `autopilot-cli tasks done <task_id>`
5. **Commit** - Git commit the changes
6. **Exit** - Context cleared completely

**Memory persists via:**
- Git history (all previous implementations)
- `.autopilot/tasks/index.json` (task states)
- `.autopilot/progress.md` (learnings from each task)
- `.autopilot/prd.json` (living requirements with notes)

### Ralph-Loop Prompt Template | Ralph-Loop 提示模板

```markdown
## Autopilot Task Implementation Loop

You are executing ONE task from the Autopilot task queue with FRESH CONTEXT.

### Your Mission

1. Get next task:
   ```bash
   TASK_JSON=$(autopilot-cli tasks next --json)
   TASK_ID=$(echo "$TASK_JSON" | jq -r '.id')
   ```

2. Mark as started:
   ```bash
   autopilot-cli tasks start "$TASK_ID"
   ```

3. Implement using TDD IRON LAW (from phase-3-implement/SKILL.md):
   - RED: Write failing test FIRST
   - GREEN: Minimal code to pass
   - REFACTOR: Clean up while staying green
   - VERIFY: All tests pass, >80% coverage

4. On success:
   ```bash
   autopilot-cli tasks done "$TASK_ID" --duration "4m 32s"
   echo "TASK_DONE:$TASK_ID" >> .autopilot/progress.md
   git add . && git commit -m "feat($MODULE): $DESCRIPTION"
   ```

5. On error:
   - Invoke phase-4-heal (systematic debugging)
   - If healing succeeds → mark done
   - If healing fails (3 attempts) → mark failed:
     ```bash
     autopilot-cli tasks fail "$TASK_ID" --reason "$ERROR_MSG"
     ```

6. Update progress memory:
   ```bash
   cat >> .autopilot/progress.md <<EOF
   ## Task: $TASK_ID ($([ success ] && echo "PASSED" || echo "FAILED"))
   - Duration: $DURATION
   - Approach: $BRIEF_SUMMARY
   - Tests: $TEST_COUNT passed
   - Learning: $KEY_LEARNING
   - Issues: $ISSUES_IF_ANY
   EOF
   ```

7. Exit to trigger next iteration

### Completion Check

Check if more tasks remain:
```bash
PENDING_COUNT=$(autopilot-cli tasks list --status pending --json | jq 'length')
if [ $PENDING_COUNT -eq 0 ]; then
  echo "All tasks complete!"
  exit 0
fi
```

### Rules

- ONE task per iteration
- Fresh context each time
- No carryover from previous tasks
- Memory = git + files, not conversation
- Follow TDD Iron Law strictly
- Show full verification output
```

### Benefits | 优势

✅ **Prevents context pollution** - Each task starts clean
✅ **Consistent quality** - Task #30 same quality as task #1
✅ **Better isolation** - Easier to debug single task
✅ **Automatic memory** - Git history is the memory
✅ **Resumable** - Can stop/start anytime

### Alternative: Manual Fresh Context | 替代方案：手动新上下文

If ralph-loop not available, spawn subagents explicitly in Phase 3:

```bash
# For each task
autopilot-cli tasks next --json > /tmp/current_task.json

# Spawn fresh agent (new conversation)
# (Would require Task tool enhancement to support true isolation)
```

## Recommendation | 建议

**Use ralph-loop for Phase 3 implementation.**

It's the proven pattern from ralph-ryan that prevents context pollution and maintains consistent quality across all tasks.

> **在第 3 阶段实现中使用 ralph-loop。**
>
> 这是经过验证的 ralph-ryan 模式，可防止上下文污染并在所有任务中保持一致的质量。
