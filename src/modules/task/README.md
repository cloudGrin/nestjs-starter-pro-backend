# 任务调度模块 - 开发指南

> 使用装饰器模式实现的任务调度系统，完全解耦，易于扩展

---

## 📋 架构概览

### 核心组件

```
┌─────────────────────────────────────────┐
│     @TaskHandler 装饰器                 │
│  (自动发现和注册 Handler)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  TaskHandlerDiscoveryService           │
│  (扫描所有标记的 Handler)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│     TaskHandlerRegistry                │
│  (Handler 注册表)                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         TaskService                    │
│  (任务调度和执行)                       │
└─────────────────────────────────────────┘
```

### 设计原则

1. ✅ **单一职责**：每个 Handler 只负责一个任务的业务逻辑
2. ✅ **依赖注入**：Handler 可以注入任何需要的服务
3. ✅ **自动注册**：使用装饰器，无需手动维护注册列表
4. ✅ **完全解耦**：Handler 和 Module 之间零耦合

---

## 🚀 快速开始

### 步骤1: 创建 Handler 类

```typescript
// src/modules/task/handlers/send-email.handler.ts
import { TaskHandler } from '../decorators/task-handler.decorator';
import { ITaskHandler } from '../interfaces/task-handler.interface';
import { LoggerService } from '~/shared/logger/logger.service';
import { EmailService } from '~/shared/email/email.service';

@TaskHandler('SendEmailHandler')  // ← 使用装饰器，指定 Handler 名称
export class SendEmailHandler implements ITaskHandler {
  readonly name = 'SendEmailHandler';
  readonly description = '发送邮件任务';

  constructor(
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,  // ← 可以注入任何服务
  ) {
    this.logger.setContext(SendEmailHandler.name);
  }

  /**
   * 执行任务
   * @param payload 任务载荷（从数据库读取）
   */
  async execute(payload?: Record<string, unknown>): Promise<void> {
    const to = payload?.to as string;
    const subject = payload?.subject as string;
    const content = payload?.content as string;

    this.logger.log(`Sending email to: ${to}`);

    await this.emailService.send({
      to,
      subject,
      content,
    });

    this.logger.log('Email sent successfully');
  }
}
```

### 步骤2: 注册到 TaskModule

```typescript
// src/modules/task/task.module.ts
import { SendEmailHandler } from './handlers';  // ← 导入

@Module({
  providers: [
    // ...
    CleanupLogsHandler,
    DataBackupHandler,
    SendEmailHandler,  // ← 添加到 providers
  ],
})
export class TaskModule {}
```

### 步骤3: 数据库中创建任务

```sql
INSERT INTO task_definitions (
  code,
  name,
  description,
  handler,  -- ← 必须与 @TaskHandler 的参数一致
  type,
  schedule,
  payload,
  status
)
VALUES (
  'daily_email_report',
  '每日邮件报告',
  '每天早上9点发送邮件报告',
  'SendEmailHandler',  -- ← 与装饰器中的名称一致
  'cron',
  '0 0 9 * * *',
  '{"to": "admin@example.com", "subject": "Daily Report", "content": "..."}',
  'enabled'
);
```

### 步骤4: 完成！

- ✅ Handler 会自动注册
- ✅ 任务会按计划执行
- ✅ 可以手动触发任务

---

## 📚 完整示例

### 示例1: 数据备份 Handler

```typescript
@TaskHandler('DataBackupHandler')
export class DataBackupHandler implements ITaskHandler {
  readonly name = 'DataBackupHandler';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(DataBackupHandler.name);
  }

  async execute(payload?: Record<string, unknown>): Promise<void> {
    const database = (payload?.database as string) || 'home_test';
    const backupPath = (payload?.backupPath as string) || '/backups/daily';

    this.logger.log(`Starting backup: ${database} → ${backupPath}`);

    // 执行备份逻辑
    await this.performBackup(database, backupPath);

    this.logger.log('Backup completed successfully');
  }

  private async performBackup(database: string, path: string): Promise<void> {
    // 实际的备份逻辑
  }
}
```

### 示例2: 系统清理 Handler

```typescript
@TaskHandler('system:cleanup-task-logs')
export class CleanupLogsHandler implements ITaskHandler {
  readonly name = 'system:cleanup-task-logs';

  constructor(
    private readonly logger: LoggerService,
    private readonly taskLogRepository: TaskLogRepository,
  ) {
    this.logger.setContext(CleanupLogsHandler.name);
  }

  async execute(payload?: Record<string, unknown>): Promise<void> {
    const retentionDays = (payload?.retentionDays as number) || 30;

    this.logger.log(`Cleaning logs older than ${retentionDays} days`);

    const deletedCount = await this.taskLogRepository.cleanupOldLogs(retentionDays);

    this.logger.log(`Deleted ${deletedCount} old logs`);
  }
}
```

---

## 🎯 Handler 命名规范

### 建议的命名格式

```typescript
// 业务任务：使用 PascalCase + Handler 后缀
@TaskHandler('SendEmailHandler')
@TaskHandler('DataBackupHandler')
@TaskHandler('GenerateReportHandler')

// 系统任务：使用 system: 前缀
@TaskHandler('system:cleanup-task-logs')
@TaskHandler('system:refresh-cache')
@TaskHandler('system:health-check')
```

### 数据库中的对应关系

| Handler 类 | @TaskHandler 参数 | 数据库 handler 字段 |
|-----------|------------------|-------------------|
| `DataBackupHandler` | `'DataBackupHandler'` | `DataBackupHandler` |
| `CleanupLogsHandler` | `'system:cleanup-task-logs'` | `system:cleanup-task-logs` |

**⚠️ 重要**：三者必须完全一致，否则任务无法执行！

---

## 🧪 测试 Handler

### 单元测试示例

```typescript
// send-email.handler.spec.ts
import { Test } from '@nestjs/testing';
import { SendEmailHandler } from './send-email.handler';
import { EmailService } from '~/shared/email/email.service';
import { LoggerService } from '~/shared/logger/logger.service';

describe('SendEmailHandler', () => {
  let handler: SendEmailHandler;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SendEmailHandler,
        {
          provide: EmailService,
          useValue: { send: jest.fn() },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), setContext: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get(SendEmailHandler);
    emailService = module.get(EmailService);
  });

  it('should send email with correct parameters', async () => {
    const payload = {
      to: 'test@example.com',
      subject: 'Test Subject',
      content: 'Test Content',
    };

    await handler.execute(payload);

    expect(emailService.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test Subject',
      content: 'Test Content',
    });
  });
});
```

---

## 💡 最佳实践

### 1. Handler 设计原则

```typescript
// ✅ 推荐：职责单一
@TaskHandler('SendDailyReportHandler')
export class SendDailyReportHandler {
  async execute() {
    await this.generateReport();
    await this.sendReport();
  }
}

// ❌ 不推荐：一个 Handler 做多件事
@TaskHandler('DailyTasksHandler')
export class DailyTasksHandler {
  async execute() {
    await this.sendReport();
    await this.backupData();
    await this.cleanupLogs();  // 应该拆分成多个 Handler
  }
}
```

### 2. 错误处理

```typescript
@TaskHandler('DataProcessHandler')
export class DataProcessHandler {
  async execute(payload?: Record<string, unknown>): Promise<void> {
    try {
      await this.processData();
    } catch (error) {
      this.logger.error(`Data processing failed: ${error.message}`);
      // 重新抛出错误，让任务系统记录失败状态
      throw error;
    }
  }
}
```

### 3. 日志记录

```typescript
@TaskHandler('ComplexTaskHandler')
export class ComplexTaskHandler {
  async execute(payload?: Record<string, unknown>): Promise<void> {
    this.logger.log('Task started');

    // 步骤1
    this.logger.log('Step 1: Processing...');
    await this.step1();

    // 步骤2
    this.logger.log('Step 2: Validating...');
    await this.step2();

    this.logger.log('Task completed successfully');
  }
}
```

### 4. Payload 验证

```typescript
@TaskHandler('SendNotificationHandler')
export class SendNotificationHandler {
  async execute(payload?: Record<string, unknown>): Promise<void> {
    // 验证必需参数
    if (!payload?.userId) {
      throw new Error('userId is required in payload');
    }

    const userId = payload.userId as string;
    const message = (payload.message as string) || 'Default message';

    await this.sendNotification(userId, message);
  }
}
```

---

## 🔍 故障排查

### 问题1: Handler 未注册

**症状**：
```
Error: Handler YourHandler not found
```

**检查清单**：
- [ ] 是否使用了 `@TaskHandler('YourHandler')` 装饰器？
- [ ] 是否在 `TaskModule.providers` 中添加了该类？
- [ ] Handler 名称是否与装饰器参数一致？
- [ ] 是否实现了 `ITaskHandler.execute()` 方法？

### 问题2: 任务执行失败

**症状**：
```
Task execution failed: Cannot read property 'xxx' of undefined
```

**检查清单**：
- [ ] 检查 `payload` 参数是否正确
- [ ] 检查数据库中的 `payload` 字段是否是有效的 JSON
- [ ] 检查依赖注入的服务是否正确初始化

### 问题3: 定时任务不执行

**检查清单**：
- [ ] 任务状态是否为 `enabled`？
- [ ] Cron 表达式是否正确？
- [ ] Handler 是否已注册？
- [ ] 查看后端日志是否有错误信息

---

## 📖 相关文档

- **装饰器源码**：`decorators/task-handler.decorator.ts`
- **接口定义**：`interfaces/task-handler.interface.ts`
- **发现服务**：`services/task-handler-discovery.service.ts`
- **示例 Handler**：`handlers/data-backup.handler.ts`

---

**最后更新**：2025-11-02
**维护者**：home Team
