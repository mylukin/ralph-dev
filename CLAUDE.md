# CLAUDE.md - Ralph-dev 项目指南

本文件为 Ralph-dev 自主开发系统提供全面的架构指导和设计原则。

---

## 📋 项目概述

**Ralph-dev** 是一个与 Claude Code 集成的自主端到端开发系统，通过5阶段工作流将自然语言需求转换为生产就绪的测试代码，初始澄清后无需人工干预。

**核心架构：**
```
澄清 → 分解 → 实现 ⇄ 修复 → 交付
```

**技术栈：**
- **CLI工具**：TypeScript 5.3+ 配合 Commander.js (cli/)
- **技能**：协调各阶段的AI代理工作流 (skills/)
- **插件**：Claude Code插件配置 (.claude-plugin/)

---

## 🎯 指导性设计原则

### 原则 1：生产优先架构

**始终为生产可靠性设计，而非仅为开发便利。**

#### 规则：

1. **扩展前实现弹性模式**
   - ✅ **应该**：为任何可能重复失败的操作添加断路器模式（API调用、修复尝试、文件I/O）
   - ✅ **应该**：为瞬态故障实现指数退避重试
   - ✅ **应该**：设置资源配额（最大任务数、最大修复尝试次数、超时限制）
   - ❌ **不应该**：假设操作总是成功
   - ❌ **不应该**：允许无限重试循环而不进行断路

2. **从第一天开始构建可观察性**
   - ✅ **应该**：使用观察者模式进行进度监控
   - ✅ **应该**：发出结构化日志（JSON格式）用于机器解析
   - ✅ **应该**：跟踪指标（任务完成率、修复成功率、阶段持续时间）
   - ✅ **应该**：提供多个通知渠道（控制台、文件、webhook、Slack）
   - ❌ **不应该**：仅依赖console.log进行调试
   - ❌ **不应该**：在监控工具需要JSON时记录非结构化文本

3. **为故障恢复而设计**
   - ✅ **应该**：对多步操作使用Saga模式并自动回滚
   - ✅ **应该**：将所有补偿操作记录到审计跟踪
   - ✅ **应该**：尽可能使操作幂等
   - ✅ **应该**：执行前验证前置条件（gitignore检查、基线测试）
   - ❌ **不应该**：失败后留下部分状态
   - ❌ **不应该**：假设"简单"操作不需要回滚

---

### 原则 2：通过分层架构分离关注点

**将业务逻辑、数据访问和展示层分离到不同的层次中。**

#### 规则：

1. **强制执行服务层模式**

   在清晰的层次中构建代码：
   ```
   命令层（CLI接口 - 薄层）
      ↓
   服务层（业务逻辑）
      ↓
   仓储层（数据访问）
      ↓
   领域模型（具有行为的实体）
      ↓
   基础设施层（文件系统、Git、外部API）
   ```

   - ✅ **应该**：保持命令层轻量 - 仅解析参数、调用服务、格式化输出
   - ✅ **应该**：将所有业务规则放在服务层
   - ✅ **应该**：在仓储接口后面抽象持久化
   - ✅ **应该**：使领域模型富含行为，而非仅是数据袋
   - ❌ **不应该**：在CLI命令中放置业务逻辑
   - ❌ **不应该**：从命令直接访问文件系统
   - ❌ **不应该**：混合展示关注点与业务规则

2. **为所有持久化应用仓储模式**

   示例结构：
   ```typescript
   interface TaskRepository {
     findById(id: string): Promise<Task | null>;
     findAll(filter?: TaskFilter): Promise<Task[]>;
     save(task: Task): Promise<void>;
     delete(id: string): Promise<void>;
   }

   class FileSystemTaskRepository implements TaskRepository {
     // 隐藏实现细节
   }
   ```

   - ✅ **应该**：定义仓储接口以提高可测试性
   - ✅ **应该**：在仓储后隐藏文件系统细节
   - ✅ **应该**：在仓储内部保持index.json更新
   - ✅ **应该**：使仓储易于交换（文件系统 → 数据库）
   - ❌ **不应该**：在代码库中分散fs.readFile/writeFile调用
   - ❌ **不应该**：让服务层知道文件路径或目录结构
   - ❌ **不应该**：从多个地方手动更新index.json

3. **构建丰富的领域模型**

   将贫血领域模型转换为丰富模型：

   **❌ 贫血（不好）：**
   ```typescript
   interface Task {
     id: string;
     status: string;
     dependencies: string[];
   }
   ```

   **✅ 丰富（好）：**
   ```typescript
   class Task {
     constructor(
       public readonly id: string,
       private status: TaskStatus,
       private dependencies: string[]
     ) {}

     canStart(): boolean {
       return this.status === 'pending';
     }

     start(): void {
       if (!this.canStart()) {
         throw new InvalidStateTransition(this.status, 'in_progress');
       }
       this.status = 'in_progress';
     }

     isBlocked(completedTasks: Set<string>): boolean {
       return this.dependencies.some(dep => !completedTasks.has(dep));
     }
   }
   ```

   - ✅ **应该**：向领域模型添加行为方法
   - ✅ **应该**：封装不变性和验证规则
   - ✅ **应该**：让模型强制执行自己的业务规则
   - ✅ **应该**：对复杂类型使用值对象（TaskId、Duration、Priority）
   - ❌ **不应该**：对核心领域实体使用普通对象/接口
   - ❌ **不应该**：在服务层分散业务规则
   - ❌ **不应该**：暴露破坏封装的内部状态

---

### 原则 3：通过设计模式实现可扩展性

**使用经过验证的设计模式使代码对扩展开放，对修改封闭。**

#### 规则：

1. **变体使用策略模式**

   当有多个算法或实现时使用：

   **当前问题**：语言检测使用if/else链
   **解决方案**：策略模式

   ```typescript
   interface LanguageDetectionStrategy {
     detect(files: string[]): LanguageConfig | null;
     getPriority(): number;
   }

   class TypeScriptDetectionStrategy implements LanguageDetectionStrategy {
     detect(files: string[]): LanguageConfig | null {
       if (files.includes('tsconfig.json')) {
         return this.buildConfig();
       }
       return null;
     }
     getPriority(): number { return 10; }
   }

   class LanguageDetector {
     private strategies: LanguageDetectionStrategy[] = [];

     register(strategy: LanguageDetectionStrategy): void {
       this.strategies.push(strategy);
     }

     detect(files: string[]): LanguageConfig {
       const sorted = this.strategies.sort((a, b) =>
         b.getPriority() - a.getPriority()
       );
       for (const strategy of sorted) {
         const result = strategy.detect(files);
         if (result) return result;
       }
       throw new Error('未检测到语言');
     }
   }
   ```

   - ✅ **应该**：对可互换算法使用策略模式
   - ✅ **应该**：使策略独立可测试
   - ✅ **应该**：允许运行时策略选择
   - ✅ **应该**：支持基于优先级的策略排序
   - ❌ **不应该**：对变体行为使用长if/else链
   - ❌ **不应该**：添加新策略时修改现有策略
   - ❌ **不应该**：硬编码策略选择逻辑

2. **复杂对象创建使用建造者模式**

   用于具有多个可选参数的对象：

   ```typescript
   class TaskBuilder {
     private task: Partial<Task> = {};

     withId(id: string): this {
       this.task.id = id;
       return this;
     }

     withModule(module: string): this {
       this.task.module = module;
       return this;
     }

     withPriority(priority: number): this {
       this.task.priority = priority;
       return this;
     }

     withDependencies(deps: string[]): this {
       this.task.dependencies = deps;
       return this;
     }

     build(): Task {
       if (!this.task.id || !this.task.module) {
         throw new Error('任务ID和模块是必需的');
       }
       return new Task({
         priority: 3,
         status: 'pending',
         estimatedMinutes: 30,
         ...this.task
       } as TaskConfig);
     }
   }

   // 使用示例
   const task = new TaskBuilder()
     .withId('auth.login')
     .withModule('auth')
     .withPriority(1)
     .withDependencies(['setup.scaffold'])
     .build();
   ```

   - ✅ **应该**：对具有4个以上可选参数的对象使用建造者模式
   - ✅ **应该**：提供流式接口（方法链）
   - ✅ **应该**：在build()方法中验证
   - ✅ **应该**：在build()中设置合理的默认值
   - ❌ **不应该**：使用具有5个以上参数的构造函数
   - ❌ **不应该**：允许构建无效对象
   - ❌ **不应该**：在代码库中分散默认值

3. **算法变体使用模板方法模式**

   用于结构相同但步骤不同的算法：

   ```typescript
   abstract class BaseSaga {
     protected steps: SagaStep[] = [];
     protected completedSteps = 0;

     async execute(): Promise<void> {
       await this.beforeExecution();

       try {
         for (const step of this.steps) {
           await this.executeStep(step);
           this.completedSteps++;
           await this.afterStepExecution(step);
         }
         await this.afterExecution();
       } catch (error) {
         await this.rollback();
         throw error;
       }
     }

     private async rollback(): Promise<void> {
       for (let i = this.completedSteps - 1; i >= 0; i--) {
         await this.steps[i].compensate();
       }
     }

     // 子类钩子
     protected async beforeExecution(): Promise<void> {}
     protected async afterStepExecution(step: SagaStep): Promise<void> {}
     protected async afterExecution(): Promise<void> {}
   }

   class Phase3Saga extends BaseSaga {
     constructor(taskId: string) {
       super();
       this.steps = [
         new StashChangesStep(),
         new UpdateTaskStep(taskId),
         new RunTestsStep(taskId)
       ];
     }

     protected async beforeExecution(): Promise<void> {
       await this.verifyGitignore();
     }
   }
   ```

   - ✅ **应该**：对具有固定结构的算法使用模板方法
   - ✅ **应该**：定义自定义点的钩子
   - ✅ **应该**：在基类中保留通用逻辑
   - ✅ **应该**：记录钩子执行顺序
   - ❌ **不应该**：在类之间复制算法结构
   - ❌ **不应该**：使每个方法都可重写
   - ❌ **不应该**：强制子类重写无关方法

4. **事件通知使用观察者模式**

   用于解耦进度监控：

   ```typescript
   interface ProgressEvent {
     phase: string;
     taskId: string | null;
     status: 'started' | 'in_progress' | 'completed' | 'failed';
     percentage: number;
     message: string;
   }

   interface ProgressObserver {
     onProgress(event: ProgressEvent): void;
   }

   class ProgressPublisher {
     private observers: ProgressObserver[] = [];

     subscribe(observer: ProgressObserver): void {
       this.observers.push(observer);
     }

     notify(event: ProgressEvent): void {
       this.observers.forEach(o => o.onProgress(event));
     }
   }

   // 具体观察者
   class ConsoleProgressObserver implements ProgressObserver {
     onProgress(event: ProgressEvent): void {
       console.log(`[${event.phase}] ${event.percentage}% - ${event.message}`);
     }
   }

   class FileProgressObserver implements ProgressObserver {
     onProgress(event: ProgressEvent): void {
       fs.appendFileSync('.ralph-dev/progress.log', JSON.stringify(event) + '\n');
     }
   }

   class SlackProgressObserver implements ProgressObserver {
     async onProgress(event: ProgressEvent): Promise<void> {
       await fetch(process.env.SLACK_WEBHOOK, {
         method: 'POST',
         body: JSON.stringify({ text: event.message })
       });
     }
   }
   ```

   - ✅ **应该**：对向多个监听器广播事件使用观察者模式
   - ✅ **应该**：使观察者独立且可重用
   - ✅ **应该**：支持动态订阅/取消订阅
   - ✅ **应该**：保持观察者聚焦（每个都有单一职责）
   - ❌ **不应该**：将业务逻辑耦合到特定通知渠道
   - ❌ **不应该**：让观察者抛出破坏工作流的异常
   - ❌ **不应该**：在业务服务中硬编码通知逻辑

---

### 原则 4：通过依赖注入实现可测试性

**通过注入依赖设计易于测试的代码。**

#### 规则：

1. **注入所有外部依赖**

   **❌ 难以测试：**
   ```typescript
   class TaskService {
     async startTask(taskId: string): Promise<void> {
       const task = await fs.readFile(`${taskId}.md`, 'utf-8');
       const parsed = JSON.parse(task);
       // ... 业务逻辑
     }
   }
   ```

   **✅ 易于测试：**
   ```typescript
   interface ITaskRepository {
     findById(id: string): Promise<Task | null>;
   }

   class TaskService {
     constructor(
       private taskRepo: ITaskRepository,
       private stateManager: IStateManager,
       private logger: ILogger
     ) {}

     async startTask(taskId: string): Promise<void> {
       const task = await this.taskRepo.findById(taskId);
       // ... 业务逻辑
     }
   }

   // 在测试中
   const mockRepo = {
     findById: vi.fn().mockResolvedValue({ id: 'test', status: 'pending' })
   };
   const service = new TaskService(mockRepo, mockState, mockLogger);
   ```

   - ✅ **应该**：注入文件系统、数据库、外部API
   - ✅ **应该**：为所有依赖定义接口
   - ✅ **应该**：使用构造函数注入
   - ✅ **应该**：为依赖连接创建工厂函数
   - ❌ **不应该**：使用全局变量或单例
   - ❌ **不应该**：在类内部实例化依赖
   - ❌ **不应该**：在业务逻辑中直接访问process.env

2. **仅模拟外部边界**

   - ✅ **应该模拟**：文件系统、HTTP客户端、数据库、process.exit、Date.now()
   - ✅ **应该真实**：业务逻辑、领域模型、内存计算
   - ❌ **不应该模拟**：被测试的代码
   - ❌ **不应该模拟**：内部实现细节

3. **测试行为，而非实现**

   **❌ 脆弱测试（测试实现）：**
   ```typescript
   it('应该使用正确参数调用 repository.save', async () => {
     await service.createTask('test.task');
     expect(mockRepo.save).toHaveBeenCalledWith(
       expect.objectContaining({ id: 'test.task' })
     );
   });
   ```

   **✅ 健壮测试（测试行为）：**
   ```typescript
   it('应该创建可检索的任务', async () => {
     await service.createTask('test.task');
     const task = await service.getTask('test.task');
     expect(task.status).toBe('pending');
   });
   ```

   - ✅ **应该**：测试可观察的行为和结果
   - ✅ **应该**：测试错误条件和边缘情况
   - ✅ **应该**：使用AAA模式（安排-执行-断言）
   - ✅ **应该**：编写能在重构后存活的测试
   - ❌ **不应该**：对函数调用次数进行断言
   - ❌ **不应该**：直接测试私有方法
   - ❌ **不应该**：将测试耦合到内部结构

---

### 原则 5：使用断路器实现故障安全操作

**通过停止重复失败的操作来防止级联故障。**

#### 规则：

1. **为修复阶段实现断路器**

   ```typescript
   enum CircuitState {
     CLOSED = 'CLOSED',     // 正常操作
     OPEN = 'OPEN',         // 快速失败模式
     HALF_OPEN = 'HALF_OPEN' // 测试恢复
   }

   class CircuitBreaker {
     private state = CircuitState.CLOSED;
     private failureCount = 0;
     private lastFailureTime: number | null = null;

     constructor(
       private failureThreshold: number = 5,
       private timeout: number = 60000 // 1分钟
     ) {}

     async execute<T>(operation: () => Promise<T>): Promise<T> {
       if (this.state === CircuitState.OPEN) {
         if (this.shouldAttemptReset()) {
           this.state = CircuitState.HALF_OPEN;
         } else {
           throw new Error('断路器已打开');
         }
       }

       try {
         const result = await operation();
         this.onSuccess();
         return result;
       } catch (error) {
         this.onFailure();
         throw error;
       }
     }

     private onSuccess(): void {
       this.failureCount = 0;
       if (this.state === CircuitState.HALF_OPEN) {
         this.state = CircuitState.CLOSED;
       }
     }

     private onFailure(): void {
       this.failureCount++;
       this.lastFailureTime = Date.now();
       if (this.failureCount >= this.failureThreshold) {
         this.state = CircuitState.OPEN;
       }
     }

     private shouldAttemptReset(): boolean {
       return (
         this.lastFailureTime !== null &&
         Date.now() - this.lastFailureTime >= this.timeout
       );
     }
   }
   ```

   - ✅ **应该**：对AI修复尝试使用断路器
   - ✅ **应该**：对外部API调用使用断路器
   - ✅ **应该**：配置失败阈值（例如5次失败）
   - ✅ **应该**：设置自动重置尝试的超时（例如60秒）
   - ✅ **应该**：在断路器打开时通知开发者
   - ❌ **不应该**：允许无限重试循环
   - ❌ **不应该**：在监控中忽略断路器状态

2. **应用带指数退避的重试**

   ```typescript
   async function withRetry<T>(
     operation: () => Promise<T>,
     config = {
       maxAttempts: 3,
       initialDelay: 100,
       maxDelay: 5000,
       backoffMultiplier: 2,
       retryableErrors: ['EBUSY', 'ENOENT', 'ETIMEDOUT']
     }
   ): Promise<T> {
     let delay = config.initialDelay;

     for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
       try {
         return await operation();
       } catch (error) {
         const isRetryable = config.retryableErrors.some(code =>
           error.code === code
         );

         if (!isRetryable || attempt === config.maxAttempts) {
           throw error;
         }

         await sleep(delay);
         delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
       }
     }
   }

   // 使用示例
   const task = await withRetry(() => taskRepo.findById('test.task'));
   ```

   - ✅ **应该**：重试瞬态故障（EBUSY、ETIMEDOUT、网络错误）
   - ✅ **应该**：使用指数退避防止系统过载
   - ✅ **应该**：设置最大延迟上限（例如5秒）
   - ✅ **应该**：限制重试次数（例如3次尝试）
   - ❌ **不应该**：重试非瞬态错误（验证、未找到）
   - ❌ **不应该**：使用固定延迟（导致惊群问题）
   - ❌ **不应该**：无限重试

---

## 🏗️ 架构模式参考

### 模式决策树

使用此决策树决定应用哪种模式：

```
功能是否有多个算法/实现？
├─ 是 → 策略模式
│
功能是否需要带回滚的多步操作？
├─ 是 → Saga模式 + 模板方法
│
功能是否涉及复杂对象创建（4个以上参数）？
├─ 是 → 建造者模式
│
功能是否需要通知多个监听器？
├─ 是 → 观察者模式
│
功能是否访问外部资源（数据库、API、文件）？
├─ 是 → 仓储模式 + 重试 + 断路器
│
功能是否有业务逻辑？
├─ 是 → 服务层 + 丰富领域模型 + 依赖注入
│
默认：
└─ 单一职责的简单类
```

---

## 📊 代码质量指标

### 目标指标

| 指标 | 目标 | 当前 | 优先级 |
|------|------|------|--------|
| **测试覆盖率** | 85%+ | 84.52% | ✅ 正常 |
| **圈复杂度** | 每函数<10 | 待定 | 🔴 测量 |
| **文件大小** | <500行 | 部分>800 | 🟡 重构 |
| **函数长度** | <50行 | 待定 | 🟡 监控 |
| **依赖深度** | <5层 | 待定 | 🟢 良好 |
| **代码重复** | <5% | 待定 | 🔴 测量 |

### 需要重构的代码异味

1. **上帝对象** - 超过500行且职责过多的文件
   - 示例：`cli/src/commands/tasks.ts`（900+行）
   - 行动：拆分为 TaskService、TaskRepository、TaskBuilder

2. **特性依恋** - 使用其他类的方法多于自己类的方法
   - 示例：命令直接访问文件系统
   - 行动：将逻辑移至适当的服务/仓储

3. **基本类型偏执** - 使用基本类型而非值对象
   - 示例：任务ID使用字符串而非TaskId类
   - 行动：为领域概念创建值对象

4. **散弹式修改** - 一个更改需要在其他地方进行多个小更改
   - 示例：添加新语言需要修改多个文件
   - 行动：应用策略模式

---

## 🚀 实施路线图

### 阶段 1：基础（优先级：关键）

**时间线：冲刺1-2**

1. ✅ **实现服务层模式**
   - 创建 `cli/src/services/` 目录
   - 将业务逻辑从命令迁移到服务
   - 定义服务接口

2. ✅ **实现仓储模式**
   - 创建 `cli/src/repositories/` 目录
   - 在TaskRepository、StateRepository后抽象文件系统
   - 更新IndexManager以与仓储协作

3. ✅ **添加依赖注入**
   - 为服务/仓储连接创建工厂函数
   - 在构造函数中注入依赖
   - 更新测试以使用mock依赖

4. ✅ **为修复实现断路器**
   - 创建 `cli/src/core/circuit-breaker.ts`
   - 用断路器包装修复代理调用
   - 添加断路器状态监控

5. ✅ **添加带指数退避的重试**
   - 创建 `cli/src/core/retry.ts`
   - 用重试包装文件操作
   - 配置可重试的错误代码

**成功标准：**
- 所有业务逻辑在服务层
- 所有持久化通过仓储
- 所有测试使用依赖注入
- 修复阶段有断路器
- 文件操作在瞬态错误时重试

---

### 阶段 2：可扩展性（优先级：高）

**时间线：冲刺3-4**

1. ✅ **对语言检测应用策略模式**
   - 创建 `LanguageDetectionStrategy` 接口
   - 为每种语言实现策略
   - 以优先级注册策略

2. ✅ **对任务创建应用建造者模式**
   - 创建 `TaskBuilder` 类
   - 更新任务创建以使用建造者
   - 在build()中添加验证

3. ✅ **对进度应用观察者模式**
   - 创建 `ProgressPublisher` 和观察者接口
   - 实现ConsoleObserver、FileObserver、WebhookObserver
   - 从工作流发出进度事件

4. ✅ **对Saga应用模板方法**
   - 创建 `BaseSaga` 抽象类
   - 重构Phase2Saga、Phase3Saga、Phase5Saga继承BaseSaga
   - 定义自定义钩子

**成功标准：**
- 可以在不修改现有代码的情况下添加新语言
- 任务创建使用流式建造者接口
- 进度事件发送到多个观察者
- 所有saga共享通用回滚逻辑

---

### 阶段 3：领域丰富性（优先级：中等）

**时间线：冲刺5-6**

1. ✅ **创建丰富的领域模型**
   - 创建 `cli/src/domain/` 目录
   - 实现具有行为方法的Task类
   - 实现具有阶段转换的State类
   - 实现值对象（TaskId、Duration、Priority）

2. ✅ **添加领域事件**
   - 创建事件类（TaskStarted、TaskCompleted、PhaseChanged）
   - 从领域模型发布事件
   - 订阅事件以产生副作用（日志、通知）

3. ✅ **添加业务规则验证器**
   - 实现TaskDependencyValidator
   - 实现PhaseTransitionValidator
   - 实现TestRequirementValidator

**成功标准：**
- 领域模型强制执行自己的不变性
- 业务规则存在于领域层，而非服务层
- 复杂类型使用值对象
- 状态变化发布领域事件

---

### 阶段 4：可观察性（优先级：中等）

**时间线：冲刺7-8**

1. ✅ **实现结构化日志**
   - 创建具有级别的Logger接口（debug、info、warn、error）
   - 实现用于机器解析的JSONLogger
   - 实现用于人类阅读的ConsoleLogger
   - 为请求跟踪添加关联ID

2. ✅ **添加指标收集**
   - 跟踪任务完成率
   - 跟踪修复成功率
   - 跟踪阶段持续时间
   - 以Prometheus格式导出指标

3. ✅ **添加健康检查**
   - 实现 `/health` 端点（如果添加HTTP API）
   - 检查工作区磁盘空间
   - 检查git仓库状态
   - 检查CLI二进制版本

**成功标准：**
- 所有日志采用结构化JSON格式
- 导出指标用于监控工具
- 健康检查报告系统状态
- 关联ID跨组件跟踪请求

---

## 📚 最佳实践总结

### 应该做的 ✅

1. **架构**
   - 使用分层架构（命令 → 服务 → 仓储 → 领域）
   - 应用设计模式（策略、建造者、观察者、模板方法）
   - 为可测试性注入依赖
   - 在接口后抽象外部资源

2. **可靠性**
   - 对可能重复失败的操作使用断路器
   - 对瞬态故障使用带指数退避的重试
   - 对多步操作使用Saga模式并回滚
   - 执行前验证前置条件

3. **测试**
   - 测试行为，而非实现
   - 使用AAA模式（安排-执行-断言）
   - 仅模拟外部边界
   - 目标85%以上代码覆盖率
   - 编写能在重构后存活的测试

4. **代码质量**
   - 保持函数<50行
   - 保持文件<500行
   - 保持圈复杂度<10
   - 使用描述性名称而非注释
   - 遵循单一职责原则

### 不应该做的 ❌

1. **架构**
   - 不要在CLI命令中放置业务逻辑
   - 不要从命令直接访问文件系统
   - 不要使用全局变量或单例
   - 不要创建具有多个职责的上帝对象

2. **可靠性**
   - 不要假设操作总是成功
   - 不要允许无限重试循环
   - 不要忽略瞬态故障
   - 不要在失败后留下部分状态

3. **测试**
   - 不要测试实现细节
   - 不要模拟被测试的代码
   - 不要编写会在重构时中断的测试
   - 不要用.skip()忽略测试失败

4. **代码质量**
   - 不要使用长if/else链（使用策略模式）
   - 不要重复代码（DRY原则）
   - 不要使用隐晦的缩写
   - 不要在一个函数中混合不同抽象级别

---

## 🔗 参考资料和资源

### 设计模式
- [Refactoring.Guru - 设计模式](https://refactoring.guru/design-patterns)
- [Martin Fowler - 企业应用架构模式](https://martinfowler.com/eaaCatalog/)
- [Eric Evans - 领域驱动设计](https://www.domainlanguage.com/ddd/)

### 测试
- [单元测试最佳实践 - Vitest](https://vitest.dev/guide/)
- [Kent Beck - 测试驱动开发](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

### 架构
- [Robert C. Martin - 整洁架构](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [十二要素应用](https://12factor.net/)
- [Chris Richardson - 微服务模式](https://microservices.io/patterns/)

### 可靠性
- [Michael Nygard - Release It!](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Google - 站点可靠性工程](https://sre.google/books/)

---

## 📝 项目特定上下文

有关CLI特定的实现细节、测试实践和命令参考，请参阅：
- **[cli/CLAUDE.md](cli/CLAUDE.md)** - TypeScript CLI工具文档

---

**最后更新：** 2026-01-20
**维护者：** Ralph-dev团队
**审查周期：** 季度
