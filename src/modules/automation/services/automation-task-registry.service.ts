import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthService } from '~/modules/auth/services/auth.service';
import { TaskReminderService } from '~/modules/task/services/task-reminder.service';
import { AutomationTaskDefinition, AutomationTaskParams } from '../types/automation-task.types';

function ensureObjectParams(params: AutomationTaskParams): AutomationTaskParams {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return {};
  }

  return params;
}

@Injectable()
export class AutomationTaskRegistryService implements OnModuleInit {
  private readonly definitions = new Map<string, AutomationTaskDefinition>();

  constructor(
    private readonly authService: AuthService,
    private readonly taskReminderService: TaskReminderService,
  ) {}

  onModuleInit(): void {
    this.register({
      key: 'cleanupExpiredRefreshTokens',
      name: '清理过期刷新令牌',
      description: '删除已经过期的 refresh token 记录',
      defaultCron: '0 3 * * *',
      defaultEnabled: true,
      defaultParams: {},
      validateParams: ensureObjectParams,
      handler: async () => {
        const count = await this.authService.cleanupExpiredTokens();
        return { message: `清理 ${count} 条过期刷新令牌` };
      },
    });

    this.register({
      key: 'sendTaskReminders',
      name: '发送任务提醒',
      description: '扫描到期提醒并发送站内或外部通知',
      defaultCron: '*/1 * * * *',
      defaultEnabled: true,
      defaultParams: {},
      validateParams: ensureObjectParams,
      handler: async () => {
        const sent = await this.taskReminderService.sendDueReminders();
        return { message: `发送 ${sent} 条任务提醒` };
      },
    });
  }

  getDefinitions(): AutomationTaskDefinition[] {
    return Array.from(this.definitions.values());
  }

  getDefinitionOrThrow(taskKey: string): AutomationTaskDefinition {
    const definition = this.definitions.get(taskKey);
    if (!definition) {
      throw new Error(`自动化任务未注册: ${taskKey}`);
    }

    return definition;
  }

  private register(definition: AutomationTaskDefinition): void {
    if (this.definitions.has(definition.key)) {
      throw new Error(`自动化任务重复注册: ${definition.key}`);
    }

    this.definitions.set(definition.key, definition);
  }
}
