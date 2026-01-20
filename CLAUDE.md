# CLAUDE.md - Ralph-dev Project Guidelines

This file provides comprehensive architectural guidance and design principles for the Ralph-dev autonomous development system.

> 本文件为 Ralph-dev 自主开发系统提供全面的架构指导和设计原则。

---

## 📋 Project Overview

**Ralph-dev** is an autonomous end-to-end development system integrated with Claude Code that transforms natural language requirements into production-ready, tested code through a 5-phase workflow with zero manual intervention after initial clarification.

> **Ralph-dev** 是一个与 Claude Code 集成的自主端到端开发系统，通过5阶段工作流将自然语言需求转换为生产就绪的测试代码，初始澄清后无需人工干预。

**Core Architecture:**
```
CLARIFY → BREAKDOWN → IMPLEMENT ⇄ HEAL → DELIVER
```

**Technology Stack:**
- **CLI Tool**: TypeScript 5.3+ with Commander.js (cli/)
- **Skills**: AI agent workflows orchestrating each phase (skills/)
- **Plugin**: Claude Code plugin configuration (.claude-plugin/)

> **技术栈：**
> - **CLI工具**：TypeScript 5.3+ 配合 Commander.js (cli/)
> - **技能**：协调各阶段的AI代理工作流 (skills/)
> - **插件**：Claude Code插件配置 (.claude-plugin/)

---

## 🎯 Guiding Design Principles

> 指导性设计原则

### Principle 1: Production-First Architecture

**Always design for production reliability, not just development convenience.**

> **始终为生产可靠性设计，而非仅为开发便利。**

#### Rules:

1. **Implement Resilience Patterns Before Scaling**
   - ✅ **DO**: Add Circuit Breaker pattern for any operation that can fail repeatedly (API calls, healing attempts, file I/O)
   - ✅ **DO**: Implement Retry with Exponential Backoff for transient failures
   - ✅ **DO**: Set resource quotas (max tasks, max healing attempts, timeout limits)
   - ❌ **DON'T**: Assume operations will always succeed
   - ❌ **DON'T**: Allow infinite retry loops without circuit breaking

   > 1. **扩展前实现弹性模式**
   > - ✅ **应该**：为任何可能重复失败的操作添加断路器模式（API调用、修复尝试、文件I/O）
   > - ✅ **应该**：为瞬态故障实现指数退避重试
   > - ✅ **应该**：设置资源配额（最大任务数、最大修复尝试次数、超时限制）
   > - ❌ **不应该**：假设操作总是成功
   > - ❌ **不应该**：允许无限重试循环而不进行断路

2. **Build Observability From Day One**
   - ✅ **DO**: Use Observer Pattern for progress monitoring
   - ✅ **DO**: Emit structured logs (JSON format) for machine parsing
   - ✅ **DO**: Track metrics (task completion rate, healing success rate, phase duration)
   - ✅ **DO**: Provide multiple notification channels (console, file, webhook, Slack)
   - ❌ **DON'T**: Rely solely on console.log for debugging
   - ❌ **DON'T**: Log unstructured text when monitoring tools need JSON

   > 2. **从第一天开始构建可观察性**
   > - ✅ **应该**：使用观察者模式进行进度监控
   > - ✅ **应该**：发出结构化日志（JSON格式）用于机器解析
   > - ✅ **应该**：跟踪指标（任务完成率、修复成功率、阶段持续时间）
   > - ✅ **应该**：提供多个通知渠道（控制台、文件、webhook、Slack）
   > - ❌ **不应该**：仅依赖console.log进行调试
   > - ❌ **不应该**：在监控工具需要JSON时记录非结构化文本

3. **Design for Failure Recovery**
   - ✅ **DO**: Use Saga Pattern for multi-step operations with automatic rollback
   - ✅ **DO**: Log all compensating actions to audit trail
   - ✅ **DO**: Make operations idempotent where possible
   - ✅ **DO**: Verify preconditions before executing (gitignore check, baseline tests)
   - ❌ **DON'T**: Leave partial state after failures
   - ❌ **DON'T**: Assume rollback isn't needed for "simple" operations

   > 3. **为故障恢复而设计**
   > - ✅ **应该**：对多步操作使用Saga模式并自动回滚
   > - ✅ **应该**：将所有补偿操作记录到审计跟踪
   > - ✅ **应该**：尽可能使操作幂等
   > - ✅ **应该**：执行前验证前置条件（gitignore检查、基线测试）
   > - ❌ **不应该**：失败后留下部分状态
   > - ❌ **不应该**：假设"简单"操作不需要回滚

---

### Principle 2: Separation of Concerns Through Layered Architecture

**Separate business logic, data access, and presentation into distinct layers.**

> **通过分层架构分离业务逻辑、数据访问和展示层。**

#### Rules:

1. **Enforce Service Layer Pattern**

   Structure code in clear layers:
   ```
   Commands (CLI Interface - Thin Layer)
      ↓
   Services (Business Logic)
      ↓
   Repositories (Data Access)
      ↓
   Domain Models (Entities with Behavior)
      ↓
   Infrastructure (File System, Git, External APIs)
   ```

   - ✅ **DO**: Keep commands thin - only parse arguments, call service, format output
   - ✅ **DO**: Put all business rules in service layer
   - ✅ **DO**: Abstract persistence behind repository interfaces
   - ✅ **DO**: Make domain models rich with behavior, not just data bags
   - ❌ **DON'T**: Put business logic in CLI commands
   - ❌ **DON'T**: Access file system directly from commands
   - ❌ **DON'T**: Mix presentation concerns with business rules

   > 1. **强制执行服务层模式**
   >
   > 在清晰的层次中构建代码：
   > ```
   > 命令层（CLI接口 - 薄层）
   >    ↓
   > 服务层（业务逻辑）
   >    ↓
   > 仓储层（数据访问）
   >    ↓
   > 领域模型（具有行为的实体）
   >    ↓
   > 基础设施层（文件系统、Git、外部API）
   > ```
   >
   > - ✅ **应该**：保持命令层轻量 - 仅解析参数、调用服务、格式化输出
   > - ✅ **应该**：将所有业务规则放在服务层
   > - ✅ **应该**：在仓储接口后面抽象持久化
   > - ✅ **应该**：使领域模型富含行为，而非仅是数据袋
   > - ❌ **不应该**：在CLI命令中放置业务逻辑
   > - ❌ **不应该**：从命令直接访问文件系统
   > - ❌ **不应该**：混合展示关注点与业务规则

2. **Apply Repository Pattern for All Persistence**

   Example structure:
   ```typescript
   interface TaskRepository {
     findById(id: string): Promise<Task | null>;
     findAll(filter?: TaskFilter): Promise<Task[]>;
     save(task: Task): Promise<void>;
     delete(id: string): Promise<void>;
   }

   class FileSystemTaskRepository implements TaskRepository {
     // Implementation details hidden
   }
   ```

   - ✅ **DO**: Define repository interfaces for testability
   - ✅ **DO**: Hide file system details behind repository
   - ✅ **DO**: Keep index.json updates inside repository
   - ✅ **DO**: Make repositories easy to swap (FileSystem → Database later)
   - ❌ **DON'T**: Scatter fs.readFile/writeFile calls across codebase
   - ❌ **DON'T**: Let services know about file paths or directory structure
   - ❌ **DON'T**: Update index.json manually from multiple places

   > 2. **为所有持久化应用仓储模式**
   >
   > 示例结构：
   > ```typescript
   > interface TaskRepository {
   >   findById(id: string): Promise<Task | null>;
   >   findAll(filter?: TaskFilter): Promise<Task[]>;
   >   save(task: Task): Promise<void>;
   >   delete(id: string): Promise<void>;
   > }
   >
   > class FileSystemTaskRepository implements TaskRepository {
   >   // 隐藏实现细节
   > }
   > ```
   >
   > - ✅ **应该**：定义仓储接口以提高可测试性
   > - ✅ **应该**：在仓储后隐藏文件系统细节
   > - ✅ **应该**：在仓储内部保持index.json更新
   > - ✅ **应该**：使仓储易于交换（文件系统 → 数据库）
   > - ❌ **不应该**：在代码库中分散fs.readFile/writeFile调用
   > - ❌ **不应该**：让服务层知道文件路径或目录结构
   > - ❌ **不应该**：从多个地方手动更新index.json

3. **Build Rich Domain Models**

   Transform anemic domain models into rich ones:

   **❌ Anemic (Bad):**
   ```typescript
   interface Task {
     id: string;
     status: string;
     dependencies: string[];
   }
   ```

   **✅ Rich (Good):**
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

   - ✅ **DO**: Add behavior methods to domain models
   - ✅ **DO**: Encapsulate invariants and validation rules
   - ✅ **DO**: Make models enforce their own business rules
   - ✅ **DO**: Use value objects for complex types (TaskId, Duration, Priority)
   - ❌ **DON'T**: Use plain objects/interfaces for core domain entities
   - ❌ **DON'T**: Scatter business rules across services
   - ❌ **DON'T**: Expose internal state that breaks encapsulation

   > 3. **构建丰富的领域模型**
   >
   > 将贫血领域模型转换为丰富模型：
   >
   > **❌ 贫血（不好）：**
   > ```typescript
   > interface Task {
   >   id: string;
   >   status: string;
   >   dependencies: string[];
   > }
   > ```
   >
   > **✅ 丰富（好）：**
   > ```typescript
   > class Task {
   >   constructor(
   >     public readonly id: string,
   >     private status: TaskStatus,
   >     private dependencies: string[]
   >   ) {}
   >
   >   canStart(): boolean {
   >     return this.status === 'pending';
   >   }
   >
   >   start(): void {
   >     if (!this.canStart()) {
   >       throw new InvalidStateTransition(this.status, 'in_progress');
   >     }
   >     this.status = 'in_progress';
   >   }
   >
   >   isBlocked(completedTasks: Set<string>): boolean {
   >     return this.dependencies.some(dep => !completedTasks.has(dep));
   >   }
   > }
   > ```
   >
   > - ✅ **应该**：向领域模型添加行为方法
   > - ✅ **应该**：封装不变性和验证规则
   > - ✅ **应该**：让模型强制执行自己的业务规则
   > - ✅ **应该**：对复杂类型使用值对象（TaskId、Duration、Priority）
   > - ❌ **不应该**：对核心领域实体使用普通对象/接口
   > - ❌ **不应该**：在服务层分散业务规则
   > - ❌ **不应该**：暴露破坏封装的内部状态

---

### Principle 3: Extensibility Through Design Patterns

**Use proven design patterns to make code open for extension, closed for modification.**

> **使用经过验证的设计模式使代码对扩展开放，对修改封闭。**

#### Rules:

1. **Strategy Pattern for Variants**

   Use when you have multiple algorithms or implementations:

   **Current Problem**: Language detection uses if/else chains
   **Solution**: Strategy Pattern

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
       throw new Error('No language detected');
     }
   }
   ```

   - ✅ **DO**: Use Strategy for interchangeable algorithms
   - ✅ **DO**: Make strategies independently testable
   - ✅ **DO**: Allow runtime strategy selection
   - ✅ **DO**: Support priority-based strategy ordering
   - ❌ **DON'T**: Use long if/else chains for variant behavior
   - ❌ **DON'T**: Modify existing strategies when adding new ones
   - ❌ **DON'T**: Hardcode strategy selection logic

   > 1. **变体使用策略模式**
   >
   > 当有多个算法或实现时使用：
   >
   > **当前问题**：语言检测使用if/else链
   > **解决方案**：策略模式
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：对可互换算法使用策略模式
   > - ✅ **应该**：使策略独立可测试
   > - ✅ **应该**：允许运行时策略选择
   > - ✅ **应该**：支持基于优先级的策略排序
   > - ❌ **不应该**：对变体行为使用长if/else链
   > - ❌ **不应该**：添加新策略时修改现有策略
   > - ❌ **不应该**：硬编码策略选择逻辑

2. **Builder Pattern for Complex Object Creation**

   Use for objects with many optional parameters:

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
         throw new Error('Task ID and module are required');
       }
       return new Task({
         priority: 3,
         status: 'pending',
         estimatedMinutes: 30,
         ...this.task
       } as TaskConfig);
     }
   }

   // Usage
   const task = new TaskBuilder()
     .withId('auth.login')
     .withModule('auth')
     .withPriority(1)
     .withDependencies(['setup.scaffold'])
     .build();
   ```

   - ✅ **DO**: Use Builder for objects with 4+ optional parameters
   - ✅ **DO**: Provide fluent interface (method chaining)
   - ✅ **DO**: Validate in build() method
   - ✅ **DO**: Set sensible defaults in build()
   - ❌ **DON'T**: Use constructors with 5+ parameters
   - ❌ **DON'T**: Allow invalid objects to be built
   - ❌ **DON'T**: Scatter default values across codebase

   > 2. **复杂对象创建使用建造者模式**
   >
   > 用于具有多个可选参数的对象：
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：对具有4个以上可选参数的对象使用建造者模式
   > - ✅ **应该**：提供流式接口（方法链）
   > - ✅ **应该**：在build()方法中验证
   > - ✅ **应该**：在build()中设置合理的默认值
   > - ❌ **不应该**：使用具有5个以上参数的构造函数
   > - ❌ **不应该**：允许构建无效对象
   > - ❌ **不应该**：在代码库中分散默认值

3. **Template Method for Algorithmic Variations**

   Use for algorithms with same structure but different steps:

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

     // Hooks for subclasses
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

   - ✅ **DO**: Use Template Method for algorithms with fixed structure
   - ✅ **DO**: Define hooks for customization points
   - ✅ **DO**: Keep common logic in base class
   - ✅ **DO**: Document hook execution order
   - ❌ **DON'T**: Duplicate algorithm structure across classes
   - ❌ **DON'T**: Make every method overridable
   - ❌ **DON'T**: Force subclasses to override irrelevant methods

   > 3. **算法变体使用模板方法模式**
   >
   > 用于结构相同但步骤不同的算法：
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：对具有固定结构的算法使用模板方法
   > - ✅ **应该**：定义自定义点的钩子
   > - ✅ **应该**：在基类中保留通用逻辑
   > - ✅ **应该**：记录钩子执行顺序
   > - ❌ **不应该**：在类之间复制算法结构
   > - ❌ **不应该**：使每个方法都可重写
   > - ❌ **不应该**：强制子类重写无关方法

4. **Observer Pattern for Event Notifications**

   Use for decoupled progress monitoring:

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

   // Concrete observers
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

   - ✅ **DO**: Use Observer for event broadcasting to multiple listeners
   - ✅ **DO**: Make observers independent and reusable
   - ✅ **DO**: Support dynamic subscription/unsubscription
   - ✅ **DO**: Keep observers focused (one responsibility each)
   - ❌ **DON'T**: Couple business logic to specific notification channels
   - ❌ **DON'T**: Let observers throw exceptions that break workflow
   - ❌ **DON'T**: Hardcode notification logic in business services

   > 4. **事件通知使用观察者模式**
   >
   > 用于解耦进度监控：
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：对向多个监听器广播事件使用观察者模式
   > - ✅ **应该**：使观察者独立且可重用
   > - ✅ **应该**：支持动态订阅/取消订阅
   > - ✅ **应该**：保持观察者聚焦（每个都有单一职责）
   > - ❌ **不应该**：将业务逻辑耦合到特定通知渠道
   > - ❌ **不应该**：让观察者抛出破坏工作流的异常
   > - ❌ **不应该**：在业务服务中硬编码通知逻辑

---

### Principle 4: Testability Through Dependency Injection

**Design code to be easily testable by injecting dependencies.**

> **通过依赖注入设计易于测试的代码。**

#### Rules:

1. **Inject All External Dependencies**

   **❌ Hard to Test:**
   ```typescript
   class TaskService {
     async startTask(taskId: string): Promise<void> {
       const task = await fs.readFile(`${taskId}.md`, 'utf-8');
       const parsed = JSON.parse(task);
       // ... business logic
     }
   }
   ```

   **✅ Easy to Test:**
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
       // ... business logic
     }
   }

   // In tests
   const mockRepo = {
     findById: vi.fn().mockResolvedValue({ id: 'test', status: 'pending' })
   };
   const service = new TaskService(mockRepo, mockState, mockLogger);
   ```

   - ✅ **DO**: Inject file system, databases, external APIs
   - ✅ **DO**: Define interfaces for all dependencies
   - ✅ **DO**: Use constructor injection
   - ✅ **DO**: Create factory functions for dependency wiring
   - ❌ **DON'T**: Use global variables or singletons
   - ❌ **DON'T**: Instantiate dependencies inside classes
   - ❌ **DON'T**: Access process.env directly in business logic

   > 1. **注入所有外部依赖**
   >
   > **❌ 难以测试：**
   > [代码示例同上]
   >
   > **✅ 易于测试：**
   > [代码示例同上]
   >
   > - ✅ **应该**：注入文件系统、数据库、外部API
   > - ✅ **应该**：为所有依赖定义接口
   > - ✅ **应该**：使用构造函数注入
   > - ✅ **应该**：为依赖连接创建工厂函数
   > - ❌ **不应该**：使用全局变量或单例
   > - ❌ **不应该**：在类内部实例化依赖
   > - ❌ **不应该**：在业务逻辑中直接访问process.env

2. **Mock Only External Boundaries**

   - ✅ **DO Mock**: File system, HTTP clients, databases, process.exit, Date.now()
   - ✅ **DO Real**: Business logic, domain models, in-memory calculations
   - ❌ **DON'T Mock**: Code under test
   - ❌ **DON'T Mock**: Internal implementation details

   > 2. **仅模拟外部边界**
   >
   > - ✅ **应该模拟**：文件系统、HTTP客户端、数据库、process.exit、Date.now()
   > - ✅ **应该真实**：业务逻辑、领域模型、内存计算
   > - ❌ **不应该模拟**：被测试的代码
   > - ❌ **不应该模拟**：内部实现细节

3. **Test Behavior, Not Implementation**

   **❌ Brittle Test (tests implementation):**
   ```typescript
   it('should call repository.save with correct params', async () => {
     await service.createTask('test.task');
     expect(mockRepo.save).toHaveBeenCalledWith(
       expect.objectContaining({ id: 'test.task' })
     );
   });
   ```

   **✅ Robust Test (tests behavior):**
   ```typescript
   it('should create task that can be retrieved', async () => {
     await service.createTask('test.task');
     const task = await service.getTask('test.task');
     expect(task.status).toBe('pending');
   });
   ```

   - ✅ **DO**: Test observable behavior and outcomes
   - ✅ **DO**: Test error conditions and edge cases
   - ✅ **DO**: Use AAA pattern (Arrange-Act-Assert)
   - ✅ **DO**: Write tests that survive refactoring
   - ❌ **DON'T**: Assert on number of function calls
   - ❌ **DON'T**: Test private methods directly
   - ❌ **DON'T**: Couple tests to internal structure

   > 3. **测试行为，而非实现**
   >
   > **❌ 脆弱测试（测试实现）：**
   > [代码示例同上]
   >
   > **✅ 健壮测试（测试行为）：**
   > [代码示例同上]
   >
   > - ✅ **应该**：测试可观察的行为和结果
   > - ✅ **应该**：测试错误条件和边缘情况
   > - ✅ **应该**：使用AAA模式（安排-执行-断言）
   > - ✅ **应该**：编写能在重构后存活的测试
   > - ❌ **不应该**：对函数调用次数进行断言
   > - ❌ **不应该**：直接测试私有方法
   > - ❌ **不应该**：将测试耦合到内部结构

---

### Principle 5: Fail-Safe Operations with Circuit Breaker

**Prevent cascading failures by stopping operations that repeatedly fail.**

> **通过停止重复失败的操作来防止级联故障。**

#### Rules:

1. **Implement Circuit Breaker for Healing Phase**

   ```typescript
   enum CircuitState {
     CLOSED = 'CLOSED',     // Normal operation
     OPEN = 'OPEN',         // Fast-fail mode
     HALF_OPEN = 'HALF_OPEN' // Testing recovery
   }

   class CircuitBreaker {
     private state = CircuitState.CLOSED;
     private failureCount = 0;
     private lastFailureTime: number | null = null;

     constructor(
       private failureThreshold: number = 5,
       private timeout: number = 60000 // 1 minute
     ) {}

     async execute<T>(operation: () => Promise<T>): Promise<T> {
       if (this.state === CircuitState.OPEN) {
         if (this.shouldAttemptReset()) {
           this.state = CircuitState.HALF_OPEN;
         } else {
           throw new Error('Circuit breaker is OPEN');
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

   - ✅ **DO**: Use Circuit Breaker for AI healing attempts
   - ✅ **DO**: Use Circuit Breaker for external API calls
   - ✅ **DO**: Configure failure threshold (e.g., 5 failures)
   - ✅ **DO**: Set timeout for automatic reset attempts (e.g., 60 seconds)
   - ✅ **DO**: Notify developers when circuit opens
   - ❌ **DON'T**: Allow infinite retry loops
   - ❌ **DON'T**: Ignore circuit state in monitoring

   > 1. **为修复阶段实现断路器**
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：对AI修复尝试使用断路器
   > - ✅ **应该**：对外部API调用使用断路器
   > - ✅ **应该**：配置失败阈值（例如5次失败）
   > - ✅ **应该**：设置自动重置尝试的超时（例如60秒）
   > - ✅ **应该**：在断路器打开时通知开发者
   > - ❌ **不应该**：允许无限重试循环
   > - ❌ **不应该**：在监控中忽略断路器状态

2. **Apply Retry with Exponential Backoff**

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

   // Usage
   const task = await withRetry(() => taskRepo.findById('test.task'));
   ```

   - ✅ **DO**: Retry transient failures (EBUSY, ETIMEDOUT, network errors)
   - ✅ **DO**: Use exponential backoff to prevent overwhelming system
   - ✅ **DO**: Set maximum delay cap (e.g., 5 seconds)
   - ✅ **DO**: Limit retry attempts (e.g., 3 attempts)
   - ❌ **DON'T**: Retry non-transient errors (validation, not found)
   - ❌ **DON'T**: Use fixed delay (causes thundering herd)
   - ❌ **DON'T**: Retry indefinitely

   > 2. **应用带指数退避的重试**
   >
   > [代码示例同上]
   >
   > - ✅ **应该**：重试瞬态故障（EBUSY、ETIMEDOUT、网络错误）
   > - ✅ **应该**：使用指数退避防止系统过载
   > - ✅ **应该**：设置最大延迟上限（例如5秒）
   > - ✅ **应该**：限制重试次数（例如3次尝试）
   > - ❌ **不应该**：重试非瞬态错误（验证、未找到）
   > - ❌ **不应该**：使用固定延迟（导致惊群问题）
   > - ❌ **不应该**：无限重试

---

## 🏗️ Architecture Patterns Reference

> 架构模式参考

### Pattern Decision Tree

> 模式决策树

Use this tree to decide which pattern to apply:

> 使用此决策树决定应用哪种模式：

```
Does the feature have multiple algorithms/implementations?
├─ YES → Strategy Pattern
│
Does the feature need multi-step operations with rollback?
├─ YES → Saga Pattern + Template Method
│
Does the feature involve complex object creation (4+ parameters)?
├─ YES → Builder Pattern
│
Does the feature need to notify multiple listeners?
├─ YES → Observer Pattern
│
Does the feature access external resources (DB, API, File)?
├─ YES → Repository Pattern + Retry + Circuit Breaker
│
Does the feature have business logic?
├─ YES → Service Layer + Rich Domain Model + Dependency Injection
│
Default:
└─ Simple class with single responsibility
```

---

## 📊 Code Quality Metrics

> 代码质量指标

### Target Metrics

> 目标指标

| Metric | Target | Current | Priority |
|--------|--------|---------|----------|
| **Test Coverage** | 85%+ | 84.52% | ✅ On Track |
| **Cyclomatic Complexity** | <10 per function | TBD | 🔴 Measure |
| **File Size** | <500 lines | Some >800 | 🟡 Refactor |
| **Function Length** | <50 lines | TBD | 🟡 Monitor |
| **Dependency Depth** | <5 layers | TBD | 🟢 Good |
| **Code Duplication** | <5% | TBD | 🔴 Measure |

> | 指标 | 目标 | 当前 | 优先级 |
> |------|------|------|--------|
> | **测试覆盖率** | 85%+ | 84.52% | ✅ 正常 |
> | **圈复杂度** | 每函数<10 | 待定 | 🔴 测量 |
> | **文件大小** | <500行 | 部分>800 | 🟡 重构 |
> | **函数长度** | <50行 | 待定 | 🟡 监控 |
> | **依赖深度** | <5层 | 待定 | 🟢 良好 |
> | **代码重复** | <5% | 待定 | 🔴 测量 |

### Code Smells to Refactor

> 需要重构的代码异味

1. **God Objects** - Files >500 lines with too many responsibilities
   > **上帝对象** - 超过500行且职责过多的文件
   - Example: `cli/src/commands/tasks.ts` (900+ lines)
   - Action: Split into TaskService, TaskRepository, TaskBuilder

2. **Feature Envy** - Methods that use more of another class than their own
   > **特性依恋** - 使用其他类的方法多于自己类的方法
   - Example: Commands accessing file system directly
   - Action: Move logic to appropriate service/repository

3. **Primitive Obsession** - Using primitives instead of value objects
   > **基本类型偏执** - 使用基本类型而非值对象
   - Example: Task ID as string instead of TaskId class
   - Action: Create value objects for domain concepts

4. **Shotgun Surgery** - One change requires many small changes elsewhere
   > **散弹式修改** - 一个更改需要在其他地方进行多个小更改
   - Example: Adding new language requires touching multiple files
   - Action: Apply Strategy Pattern

---

## 🚀 Implementation Roadmap

> 实施路线图

### Phase 1: Foundation (Priority: CRITICAL)

> 阶段1：基础（优先级：关键）

**Timeline: Sprint 1-2**

> **时间线：冲刺1-2**

1. ✅ **Implement Service Layer Pattern**
   - Create `cli/src/services/` directory
   - Migrate business logic from commands to services
   - Define service interfaces

   > 1. ✅ **实现服务层模式**
   > - 创建 `cli/src/services/` 目录
   > - 将业务逻辑从命令迁移到服务
   > - 定义服务接口

2. ✅ **Implement Repository Pattern**
   - Create `cli/src/repositories/` directory
   - Abstract file system behind TaskRepository, StateRepository
   - Update IndexManager to work with repositories

   > 2. ✅ **实现仓储模式**
   > - 创建 `cli/src/repositories/` 目录
   > - 在TaskRepository、StateRepository后抽象文件系统
   > - 更新IndexManager以与仓储协作

3. ✅ **Add Dependency Injection**
   - Create factory functions for service/repository wiring
   - Inject dependencies in constructors
   - Update tests to use mock dependencies

   > 3. ✅ **添加依赖注入**
   > - 为服务/仓储连接创建工厂函数
   > - 在构造函数中注入依赖
   > - 更新测试以使用mock依赖

4. ✅ **Implement Circuit Breaker for Healing**
   - Create `cli/src/core/circuit-breaker.ts`
   - Wrap healing agent calls with circuit breaker
   - Add monitoring for circuit state

   > 4. ✅ **为修复实现断路器**
   > - 创建 `cli/src/core/circuit-breaker.ts`
   > - 用断路器包装修复代理调用
   > - 添加断路器状态监控

5. ✅ **Add Retry with Exponential Backoff**
   - Create `cli/src/core/retry.ts`
   - Wrap file operations with retry
   - Configure retryable error codes

   > 5. ✅ **添加带指数退避的重试**
   > - 创建 `cli/src/core/retry.ts`
   > - 用重试包装文件操作
   > - 配置可重试的错误代码

**Success Criteria:**
- All business logic in service layer
- All persistence through repositories
- All tests use dependency injection
- Healing phase has circuit breaker
- File operations retry on transient errors

> **成功标准：**
> - 所有业务逻辑在服务层
> - 所有持久化通过仓储
> - 所有测试使用依赖注入
> - 修复阶段有断路器
> - 文件操作在瞬态错误时重试

---

### Phase 2: Extensibility (Priority: HIGH)

> 阶段2：可扩展性（优先级：高）

**Timeline: Sprint 3-4**

> **时间线：冲刺3-4**

1. ✅ **Apply Strategy Pattern to Language Detection**
   - Create `LanguageDetectionStrategy` interface
   - Implement strategy per language
   - Register strategies with priority

   > 1. ✅ **对语言检测应用策略模式**
   > - 创建 `LanguageDetectionStrategy` 接口
   > - 为每种语言实现策略
   > - 以优先级注册策略

2. ✅ **Apply Builder Pattern to Task Creation**
   - Create `TaskBuilder` class
   - Update task creation to use builder
   - Add validation in build()

   > 2. ✅ **对任务创建应用建造者模式**
   > - 创建 `TaskBuilder` 类
   > - 更新任务创建以使用建造者
   > - 在build()中添加验证

3. ✅ **Apply Observer Pattern for Progress**
   - Create `ProgressPublisher` and observer interfaces
   - Implement ConsoleObserver, FileObserver, WebhookObserver
   - Emit progress events from workflow

   > 3. ✅ **对进度应用观察者模式**
   > - 创建 `ProgressPublisher` 和观察者接口
   > - 实现ConsoleObserver、FileObserver、WebhookObserver
   > - 从工作流发出进度事件

4. ✅ **Apply Template Method to Sagas**
   - Create `BaseSaga` abstract class
   - Refactor Phase2Saga, Phase3Saga, Phase5Saga to extend BaseSaga
   - Define hooks for customization

   > 4. ✅ **对Saga应用模板方法**
   > - 创建 `BaseSaga` 抽象类
   > - 重构Phase2Saga、Phase3Saga、Phase5Saga继承BaseSaga
   > - 定义自定义钩子

**Success Criteria:**
- New languages can be added without modifying existing code
- Task creation uses fluent builder interface
- Progress events sent to multiple observers
- All sagas share common rollback logic

> **成功标准：**
> - 可以在不修改现有代码的情况下添加新语言
> - 任务创建使用流式建造者接口
> - 进度事件发送到多个观察者
> - 所有saga共享通用回滚逻辑

---

### Phase 3: Domain Richness (Priority: MEDIUM)

> 阶段3：领域丰富性（优先级：中等）

**Timeline: Sprint 5-6**

> **时间线：冲刺5-6**

1. ✅ **Create Rich Domain Models**
   - Create `cli/src/domain/` directory
   - Implement Task class with behavior methods
   - Implement State class with phase transitions
   - Implement value objects (TaskId, Duration, Priority)

   > 1. ✅ **创建丰富的领域模型**
   > - 创建 `cli/src/domain/` 目录
   > - 实现具有行为方法的Task类
   > - 实现具有阶段转换的State类
   > - 实现值对象（TaskId、Duration、Priority）

2. ✅ **Add Domain Events**
   - Create event classes (TaskStarted, TaskCompleted, PhaseChanged)
   - Publish events from domain models
   - Subscribe to events for side effects (logging, notifications)

   > 2. ✅ **添加领域事件**
   > - 创建事件类（TaskStarted、TaskCompleted、PhaseChanged）
   > - 从领域模型发布事件
   > - 订阅事件以产生副作用（日志、通知）

3. ✅ **Add Business Rule Validators**
   - Implement TaskDependencyValidator
   - Implement PhaseTransitionValidator
   - Implement TestRequirementValidator

   > 3. ✅ **添加业务规则验证器**
   > - 实现TaskDependencyValidator
   > - 实现PhaseTransitionValidator
   > - 实现TestRequirementValidator

**Success Criteria:**
- Domain models enforce their own invariants
- Business rules live in domain layer, not services
- Value objects used for complex types
- Domain events published for state changes

> **成功标准：**
> - 领域模型强制执行自己的不变性
> - 业务规则存在于领域层，而非服务层
> - 复杂类型使用值对象
> - 状态变化发布领域事件

---

### Phase 4: Observability (Priority: MEDIUM)

> 阶段4：可观察性（优先级：中等）

**Timeline: Sprint 7-8**

> **时间线：冲刺7-8**

1. ✅ **Implement Structured Logging**
   - Create Logger interface with levels (debug, info, warn, error)
   - Implement JSONLogger for machine parsing
   - Implement ConsoleLogger for human reading
   - Add correlation IDs for request tracing

   > 1. ✅ **实现结构化日志**
   > - 创建具有级别的Logger接口（debug、info、warn、error）
   > - 实现用于机器解析的JSONLogger
   > - 实现用于人类阅读的ConsoleLogger
   > - 为请求跟踪添加关联ID

2. ✅ **Add Metrics Collection**
   - Track task completion rate
   - Track healing success rate
   - Track phase duration
   - Export metrics in Prometheus format

   > 2. ✅ **添加指标收集**
   > - 跟踪任务完成率
   > - 跟踪修复成功率
   > - 跟踪阶段持续时间
   > - 以Prometheus格式导出指标

3. ✅ **Add Health Checks**
   - Implement `/health` endpoint (if adding HTTP API)
   - Check workspace disk space
   - Check git repository state
   - Check CLI binary version

   > 3. ✅ **添加健康检查**
   > - 实现 `/health` 端点（如果添加HTTP API）
   > - 检查工作区磁盘空间
   > - 检查git仓库状态
   > - 检查CLI二进制版本

**Success Criteria:**
- All logs in structured JSON format
- Metrics exported for monitoring tools
- Health checks report system state
- Correlation IDs trace requests across components

> **成功标准：**
> - 所有日志采用结构化JSON格式
> - 导出指标用于监控工具
> - 健康检查报告系统状态
> - 关联ID跨组件跟踪请求

---

## 📚 Best Practices Summary

> 最佳实践总结

### Do's ✅

> 应该做的 ✅

1. **Architecture**
   - Use layered architecture (Commands → Services → Repositories → Domain)
   - Apply design patterns (Strategy, Builder, Observer, Template Method)
   - Inject dependencies for testability
   - Abstract external resources behind interfaces

   > 1. **架构**
   > - 使用分层架构（命令 → 服务 → 仓储 → 领域）
   > - 应用设计模式（策略、建造者、观察者、模板方法）
   > - 为可测试性注入依赖
   > - 在接口后抽象外部资源

2. **Reliability**
   - Use Circuit Breaker for operations that can fail repeatedly
   - Use Retry with Exponential Backoff for transient failures
   - Use Saga Pattern for multi-step operations with rollback
   - Validate preconditions before executing

   > 2. **可靠性**
   > - 对可能重复失败的操作使用断路器
   > - 对瞬态故障使用带指数退避的重试
   > - 对多步操作使用Saga模式并回滚
   > - 执行前验证前置条件

3. **Testing**
   - Test behavior, not implementation
   - Use AAA pattern (Arrange-Act-Assert)
   - Mock only external boundaries
   - Aim for 85%+ code coverage
   - Write tests that survive refactoring

   > 3. **测试**
   > - 测试行为，而非实现
   > - 使用AAA模式（安排-执行-断言）
   > - 仅模拟外部边界
   > - 目标85%以上代码覆盖率
   > - 编写能在重构后存活的测试

4. **Code Quality**
   - Keep functions <50 lines
   - Keep files <500 lines
   - Keep cyclomatic complexity <10
   - Use descriptive names over comments
   - Follow single responsibility principle

   > 4. **代码质量**
   > - 保持函数<50行
   > - 保持文件<500行
   > - 保持圈复杂度<10
   > - 使用描述性名称而非注释
   > - 遵循单一职责原则

### Don'ts ❌

> 不应该做的 ❌

1. **Architecture**
   - Don't put business logic in CLI commands
   - Don't access file system directly from commands
   - Don't use global variables or singletons
   - Don't create god objects with many responsibilities

   > 1. **架构**
   > - 不要在CLI命令中放置业务逻辑
   > - 不要从命令直接访问文件系统
   > - 不要使用全局变量或单例
   > - 不要创建具有多个职责的上帝对象

2. **Reliability**
   - Don't assume operations always succeed
   - Don't allow infinite retry loops
   - Don't ignore transient failures
   - Don't leave partial state after failures

   > 2. **可靠性**
   > - 不要假设操作总是成功
   > - 不要允许无限重试循环
   > - 不要忽略瞬态故障
   > - 不要在失败后留下部分状态

3. **Testing**
   - Don't test implementation details
   - Don't mock code under test
   - Don't write tests that break with refactoring
   - Don't ignore test failures with .skip()

   > 3. **测试**
   > - 不要测试实现细节
   > - 不要模拟被测试的代码
   > - 不要编写会在重构时中断的测试
   > - 不要用.skip()忽略测试失败

4. **Code Quality**
   - Don't use long if/else chains (use Strategy Pattern)
   - Don't duplicate code (DRY principle)
   - Don't use cryptic abbreviations
   - Don't mix levels of abstraction in one function

   > 4. **代码质量**
   > - 不要使用长if/else链（使用策略模式）
   > - 不要重复代码（DRY原则）
   > - 不要使用隐晦的缩写
   > - 不要在一个函数中混合不同抽象级别

---

## 🔗 References and Resources

> 参考资料和资源

### Design Patterns
- [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Martin Fowler - Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)

### Testing
- [Unit Testing Best Practices - Vitest](https://vitest.dev/guide/)
- [Test Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)

### Architecture
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [The Twelve-Factor App](https://12factor.net/)
- [Microservices Patterns by Chris Richardson](https://microservices.io/patterns/)

### Reliability
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Site Reliability Engineering by Google](https://sre.google/books/)

> ### 设计模式
> - [Refactoring.Guru - 设计模式](https://refactoring.guru/design-patterns)
> - [Martin Fowler - 企业应用架构模式](https://martinfowler.com/eaaCatalog/)
> - [Eric Evans - 领域驱动设计](https://www.domainlanguage.com/ddd/)
>
> ### 测试
> - [单元测试最佳实践 - Vitest](https://vitest.dev/guide/)
> - [Kent Beck - 测试驱动开发](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
>
> ### 架构
> - [Robert C. Martin - 整洁架构](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
> - [十二要素应用](https://12factor.net/)
> - [Chris Richardson - 微服务模式](https://microservices.io/patterns/)
>
> ### 可靠性
> - [Michael Nygard - Release It!](https://pragprog.com/titles/mnee2/release-it-second-edition/)
> - [Google - 站点可靠性工程](https://sre.google/books/)

---

## 📝 Project-Specific Context

For CLI-specific implementation details, testing practices, and command reference, see:
- **[cli/CLAUDE.md](cli/CLAUDE.md)** - TypeScript CLI tool documentation

> 有关CLI特定的实现细节、测试实践和命令参考，请参阅：
> - **[cli/CLAUDE.md](cli/CLAUDE.md)** - TypeScript CLI工具文档

---

**Last Updated:** 2026-01-20
**Maintained By:** Ralph-dev Team
**Review Cycle:** Quarterly

> **最后更新：** 2026-01-20
> **维护者：** Ralph-dev团队
> **审查周期：** 季度
