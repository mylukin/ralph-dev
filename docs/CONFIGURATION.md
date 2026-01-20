# Ralph-dev Configuration Guide

[English](#english) | [中文](#中文)

---

## English

### Overview

Ralph-dev can be configured through environment variables or configuration files to customize behavior.

### Environment Variables

#### Core Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CI` | Enable CI mode for tests (non-interactive) | - |
| `RALPH_DEV_WORKSPACE` | Override workspace directory | `process.cwd()` |

#### Bootstrap Variables (shared/bootstrap-cli.sh)

| Variable | Purpose | Default |
|----------|---------|---------|
| `SKIP_BOOTSTRAP` | Skip automatic CLI bootstrap | `0` |
| `FORCE_REBUILD` | Force local CLI rebuild | `0` |

#### CI/CD Variables

These can also be configured via `.ralph-dev/ci-config.yml` (recommended):

| Variable | Purpose | Default |
|----------|---------|---------|
| `RALPH_DEV_CI_MODE` | Enable CI mode | `false` |
| `RALPH_DEV_AUTO_APPROVE` | Auto-approve task breakdown | `false` |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | - |

#### Git Variables (Standard)

| Variable | Purpose |
|----------|---------|
| `GIT_AUTHOR_NAME` | Git commit author name |
| `GIT_AUTHOR_EMAIL` | Git commit author email |
| `GIT_COMMITTER_NAME` | Git committer name |
| `GIT_COMMITTER_EMAIL` | Git committer email |

#### Claude Code Variables (System-provided)

| Variable | Purpose |
|----------|---------|
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory |
| `CLAUDE_PROJECT_DIR` | Current project directory |
| `CLAUDE_ENV_FILE` | Environment file for persistence |

### CI/CD Configuration File

For CI/CD automation, use `.ralph-dev/ci-config.yml` instead of environment variables:

```yaml
# .ralph-dev/ci-config.yml
ci_mode:
  enabled: true
  auto_approve_breakdown: true

  # Pre-defined answers for Phase 1 (no interactive questions)
  clarify_answers:
    project_type: "Web application"
    tech_stack: "TypeScript"
    scale: "Production"
    auth: "Basic"
    deployment: "Cloud"

  # Resource limits
  limits:
    max_tasks: 50
    max_healing_time: "30m"
    max_total_time: "4h"

  # Notifications
  notifications:
    slack_webhook: "https://hooks.slack.com/..."
    on_success: true
    on_failure: true

  # Git configuration
  git:
    author: "CI Bot <[email protected]>"
    branch_prefix: "ralph-dev/"

  # PR configuration
  pr:
    labels: ["auto-generated", "ralph-dev"]
    reviewers: ["team-lead"]
    auto_merge_on_success: false
```

### Hooks Behavior

Ralph-dev uses three hooks:

| Hook | File | Purpose |
|------|------|---------|
| `SessionStart` | `hooks/session-start.sh` | Install workflow rules, display session state |
| `PreCompact` | `hooks/pre-compact.sh` | Save state checkpoint before compression |
| `Stop` | `hooks/stop-hook.sh` | Prevent exit until session complete |

#### Stop Hook Behavior

The Stop hook prevents Claude from exiting while a ralph-dev session is in progress:

- **Allow stop**: No state file exists OR `phase == "complete"`
- **Block stop**: Any other phase (clarify, breakdown, implement, heal, deliver)

When blocked, the hook returns a prompt to resume the current phase.

### Testing Configuration

**CRITICAL**: Always use `CI=true` when running tests:

```bash
CI=true npm test
CI=true npx vitest run src/core/task-parser.test.ts
```

---

## 中文

### 概述

Ralph-dev 可以通过环境变量或配置文件进行配置以自定义行为。

### 环境变量

#### 核心变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `CI` | 启用 CI 模式运行测试（非交互） | - |
| `RALPH_DEV_WORKSPACE` | 覆盖工作区目录 | `process.cwd()` |

#### Bootstrap 变量 (shared/bootstrap-cli.sh)

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `SKIP_BOOTSTRAP` | 跳过自动 CLI 引导 | `0` |
| `FORCE_REBUILD` | 强制本地 CLI 重建 | `0` |

#### CI/CD 变量

这些也可以通过 `.ralph-dev/ci-config.yml` 配置（推荐）：

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `RALPH_DEV_CI_MODE` | 启用 CI 模式 | `false` |
| `RALPH_DEV_AUTO_APPROVE` | 自动批准任务分解 | `false` |
| `SLACK_WEBHOOK_URL` | Slack 通知 webhook | - |

#### Git 变量（标准）

| 变量 | 用途 |
|------|------|
| `GIT_AUTHOR_NAME` | Git 提交作者名称 |
| `GIT_AUTHOR_EMAIL` | Git 提交作者邮箱 |
| `GIT_COMMITTER_NAME` | Git 提交者名称 |
| `GIT_COMMITTER_EMAIL` | Git 提交者邮箱 |

#### Claude Code 变量（系统提供）

| 变量 | 用途 |
|------|------|
| `CLAUDE_PLUGIN_ROOT` | 插件安装目录 |
| `CLAUDE_PROJECT_DIR` | 当前项目目录 |
| `CLAUDE_ENV_FILE` | 持久化环境文件 |

### CI/CD 配置文件

对于 CI/CD 自动化，使用 `.ralph-dev/ci-config.yml` 而不是环境变量：

```yaml
# .ralph-dev/ci-config.yml
ci_mode:
  enabled: true
  auto_approve_breakdown: true

  # Phase 1 预定义答案（无交互问题）
  clarify_answers:
    project_type: "Web application"
    tech_stack: "TypeScript"
    scale: "Production"
    auth: "Basic"
    deployment: "Cloud"

  # 资源限制
  limits:
    max_tasks: 50
    max_healing_time: "30m"
    max_total_time: "4h"

  # 通知
  notifications:
    slack_webhook: "https://hooks.slack.com/..."
    on_success: true
    on_failure: true

  # Git 配置
  git:
    author: "CI Bot <[email protected]>"
    branch_prefix: "ralph-dev/"

  # PR 配置
  pr:
    labels: ["auto-generated", "ralph-dev"]
    reviewers: ["team-lead"]
    auto_merge_on_success: false
```

### Hooks 行为

Ralph-dev 使用三个 hooks：

| Hook | 文件 | 用途 |
|------|------|------|
| `SessionStart` | `hooks/session-start.sh` | 安装工作流规则，显示会话状态 |
| `PreCompact` | `hooks/pre-compact.sh` | 压缩前保存状态检查点 |
| `Stop` | `hooks/stop-hook.sh` | 防止在会话完成前退出 |

#### Stop Hook 行为

Stop hook 防止 Claude 在 ralph-dev 会话进行中退出：

- **允许停止**：状态文件不存在 或 `phase == "complete"`
- **阻止停止**：任何其他阶段（clarify、breakdown、implement、heal、deliver）

当被阻止时，hook 返回一个提示以恢复当前阶段。

### 测试配置

**重要**：运行测试时始终使用 `CI=true`：

```bash
CI=true npm test
CI=true npx vitest run src/core/task-parser.test.ts
```
