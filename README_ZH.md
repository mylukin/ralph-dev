# Ralph-dev

[English](README.md) | [中文](README_ZH.md)

自主开发系统，将需求转化为生产就绪代码。

[![npm version](https://img.shields.io/npm/v/ralph-dev.svg)](https://www.npmjs.com/package/ralph-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 快速开始

```bash
# 添加 marketplace
/plugin marketplace add mylukin/ralph-dev

# 安装插件
/plugin install ralph-dev

# 运行第一个任务
/ralph-dev "构建用户认证 REST API"
```

就这样！Ralph-dev 将：
1. 提出澄清问题（回答 A/B/C/D）
2. 生成任务分解（审查并批准）
3. 使用 TDD 实现（观察进度）
4. 自动创建 PR（审查并合并）

## 核心功能

- **交互式澄清** - 结构化问题消除歧义
- **自主分解** - 分解为原子任务（每个 <30 分钟）
- **自愈** - 使用 WebSearch 自动修复错误（86% 成功率）
- **TDD 强制执行** - 测试优先，无例外
- **两阶段审查** - 规范合规性 + 代码质量
- **通用语言** - 自动检测任何编程语言
- **自动交付** - 创建提交和 PR

## 工作原理

```
阶段 1: 澄清   → 阶段 2: 分解 → 阶段 3: 实现
阶段 4: 自愈   → 阶段 5: 交付
```

**示例任务：** "添加密码重置功能"

**阶段 1**（1-2 分钟）：询问重置方法、令牌过期等

**阶段 2**（30 秒）：生成 5 个原子任务及估算

**阶段 3**（自动）：使用 TDD 实现每个任务
```
✅ auth.password-reset.api 已完成 (1/5)
   耗时: 23m 15s | 测试: 12/12 ✓ | 覆盖率: 92%
```

**阶段 4**（自动，如需要）：通过 WebSearch 自动修复错误

**阶段 5**（自动）：运行质量门并创建 PR

## 安装

### 前置要求
- Claude Code（最新版）
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git 仓库

### 方式 1: 通过 Marketplace（推荐）
```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
```

### 方式 2: 直接从 GitHub
```
/plugin install mylukin/ralph-dev
```

### 方式 3: 本地开发
```bash
git clone https://github.com/mylukin/ralph-dev.git
cd ralph-dev
ln -s $(pwd) ~/.claude/plugins/ralph-dev
```

**注意：** CLI 在首次使用时自动构建（约 15-30 秒）。

## 使用示例

**新功能：**
```
/ralph-dev "使用 WebSocket 添加实时通知"
```

**Bug 修复：**
```
/ralph-dev "修复：用户可以通过直接 API 调用绕过邮箱验证"
```

**重构：**
```
/ralph-dev "重构认证中间件以使用装饰器模式"
```

## 架构

```
ralph-dev/
├── cli/              # TypeScript CLI（状态、任务、检测）
├── skills/           # 5 个阶段技能 + 编排器
├── commands/         # /ralph-dev 命令
├── agents/           # 语言检测器
└── .claude-plugin/   # 插件配置
```

**工作区结构：**
```
your-project/
└── .ralph-dev/
    ├── state.json
    ├── prd.md
    └── tasks/
```

## 故障排除

**找不到 Marketplace：**
```
/plugin install mylukin/ralph-dev  # 直接安装
```

**插件未加载：**
```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/clear
```

**CLI 构建失败：**
```bash
node --version  # 检查 >= 18.0.0
npm --version   # 检查 >= 9.0.0
cd ~/.claude/plugins/ralph-dev/cli && npm install && npm run build
```

## 贡献

- **问题反馈**: [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- **功能建议**: [GitHub Discussions](https://github.com/mylukin/ralph-dev/discussions)
- **PR 流程**: Fork → 功能分支 → 测试 → 语义化提交 → PR

## 许可证

MIT - 详见 [LICENSE](LICENSE)

## 支持

- 📖 [技能文档](/skills)
- 🐛 [GitHub Issues](https://github.com/mylukin/ralph-dev/issues)
- 💬 [讨论区](https://github.com/mylukin/ralph-dev/discussions)
- 🌐 [代码仓库](https://github.com/mylukin/ralph-dev)

---

**准备开始了吗？**

```
/plugin marketplace add mylukin/ralph-dev
/plugin install ralph-dev
/ralph-dev "你的任务"
```
