# Ralph-dev Configuration Guide

[English](#english) | [中文](#中文)

---

## English

### Overview

Ralph-dev can be configured through environment variables or `.claude/CLAUDE.md` file to customize workspace behavior.

### Configuration via Environment Variables

Set environment variables before running ralph-dev:

```bash
# Auto-cleanup after delivery
export RALPH_DEV_AUTO_CLEANUP=true   # Auto-cleanup temporary files
export RALPH_DEV_AUTO_CLEANUP=false  # Keep all files
export RALPH_DEV_AUTO_CLEANUP=ask    # Ask user (default)

# Baseline test behavior
export RALPH_DEV_SKIP_BASELINE=true  # Skip baseline test verification
export RALPH_DEV_SKIP_BASELINE=false # Run baseline tests (default)
```

### Configuration via CLAUDE.md

Add configuration to `.claude/CLAUDE.md`:

```markdown
# Ralph-dev Configuration

## Auto-Cleanup

```bash
export RALPH_DEV_AUTO_CLEANUP=true
```

Automatically remove temporary files after delivery (state.json, progress.log, debug.log).
Preserves documentation (prd.md, tasks/).

## Baseline Testing

```bash
export RALPH_DEV_SKIP_BASELINE=false
```

Verify all tests pass before starting implementation (recommended).
```

### Available Configuration Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `RALPH_DEV_AUTO_CLEANUP` | `true`, `false`, `ask` | `ask` | Cleanup temporary files after delivery |
| `RALPH_DEV_SKIP_BASELINE` | `true`, `false` | `false` | Skip baseline test verification |

### Configuration Priority

1. Environment variables (highest priority)
2. `.claude/CLAUDE.md` file
3. Default values (lowest priority)

### Example: Project-Specific Configuration

Create `.claude/CLAUDE.md` in your project root:

```markdown
# Project Configuration

## Ralph-dev Settings

```bash
# Auto-cleanup enabled for this project
export RALPH_DEV_AUTO_CLEANUP=true

# Always run baseline tests (enforce clean starting point)
export RALPH_DEV_SKIP_BASELINE=false
```

## Other project settings...
```

### Safety Features

Ralph-dev includes the following safety checks (inspired by Superpowers):

1. **Gitignore Verification** (Phase 2)
   - Automatically checks if `.ralph-dev/` is in gitignore
   - Adds missing entries and commits if needed
   - Uses `git check-ignore` to respect all gitignore levels

2. **Baseline Test Verification** (Phase 3)
   - Runs tests before starting implementation
   - Ensures clean starting point
   - Allows user to fix failing tests or continue

3. **Auto-Cleanup** (Phase 5)
   - Removes temporary files after delivery
   - Preserves documentation files
   - Configurable behavior

---

## 中文

### 概述

Ralph-dev 可以通过环境变量或 `.claude/CLAUDE.md` 文件进行配置以自定义工作区行为。

### 通过环境变量配置

在运行 ralph-dev 之前设置环境变量：

```bash
# 交付后自动清理
export RALPH_DEV_AUTO_CLEANUP=true   # 自动清理临时文件
export RALPH_DEV_AUTO_CLEANUP=false  # 保留所有文件
export RALPH_DEV_AUTO_CLEANUP=ask    # 询问用户（默认）

# 基线测试行为
export RALPH_DEV_SKIP_BASELINE=true  # 跳过基线测试验证
export RALPH_DEV_SKIP_BASELINE=false # 运行基线测试（默认）
```

### 通过 CLAUDE.md 配置

将配置添加到 `.claude/CLAUDE.md`：

```markdown
# Ralph-dev 配置

## 自动清理

```bash
export RALPH_DEV_AUTO_CLEANUP=true
```

交付后自动删除临时文件（state.json、progress.log、debug.log）。
保留文档（prd.md、tasks/）。

## 基线测试

```bash
export RALPH_DEV_SKIP_BASELINE=false
```

在开始实现前验证所有测试通过（推荐）。
```

### 可用配置选项

| 选项 | 值 | 默认值 | 描述 |
|------|-----|--------|------|
| `RALPH_DEV_AUTO_CLEANUP` | `true`, `false`, `ask` | `ask` | 交付后清理临时文件 |
| `RALPH_DEV_SKIP_BASELINE` | `true`, `false` | `false` | 跳过基线测试验证 |

### 配置优先级

1. 环境变量（最高优先级）
2. `.claude/CLAUDE.md` 文件
3. 默认值（最低优先级）

### 示例：项目特定配置

在项目根目录创建 `.claude/CLAUDE.md`：

```markdown
# 项目配置

## Ralph-dev 设置

```bash
# 为此项目启用自动清理
export RALPH_DEV_AUTO_CLEANUP=true

# 始终运行基线测试（强制执行干净的起点）
export RALPH_DEV_SKIP_BASELINE=false
```

## 其他项目设置...
```

### 安全功能

Ralph-dev 包含以下安全检查（受 Superpowers 启发）：

1. **Gitignore 验证**（Phase 2）
   - 自动检查 `.ralph-dev/` 是否在 gitignore 中
   - 如需要添加缺失的条目并提交
   - 使用 `git check-ignore` 以尊重所有 gitignore 级别

2. **基线测试验证**（Phase 3）
   - 在开始实现前运行测试
   - 确保干净的起点
   - 允许用户修复失败的测试或继续

3. **自动清理**（Phase 5）
   - 交付后删除临时文件
   - 保留文档文件
   - 可配置行为
