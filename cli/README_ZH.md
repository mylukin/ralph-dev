# Ralph-dev CLI

**中文** | [English](./README.md)

高效的 Ralph-dev TypeScript 命令行工具。

## 快速开始

```bash
cd cli && npm install && npm run build
npx ralph-dev <command>
```

## 核心命令

**任务管理**
```bash
ralph-dev tasks next --json          # 获取下一个任务
ralph-dev tasks done <id>            # 标记完成
ralph-dev tasks list --status pending
```

**状态管理**
```bash
ralph-dev state get phase            # 读取状态
ralph-dev state set phase implement  # 更新状态
ralph-dev state show --json          # 完整状态
```

**语言检测**
```bash
ralph-dev detect language            # 自动检测项目语言
ralph-dev detect verify-commands     # 获取测试/构建命令
```

**PRD 操作**
```bash
ralph-dev prd parse .ralph-dev/prd.md --json
ralph-dev prd generate-tasks <file> --output .ralph-dev/tasks/
```

**验证执行**
```bash
ralph-dev verify                     # 运行自动检测的检查
ralph-dev verify --language python   # 指定语言
```

## 架构

```
src/
├── commands/      # 状态、任务、PRD、检测、验证
├── core/          # 任务解析器/写入器、索引管理器
└── language/      # 语言检测逻辑
```

## 在技能中使用

```bash
# 高效的任务迭代
TASK=$(ralph-dev tasks next --json)
TASK_ID=$(echo $TASK | jq -r '.id')

# ... 实现任务 ...

ralph-dev tasks done "$TASK_ID" --files "src/auth.ts"
```

实现细节请参阅源代码。
