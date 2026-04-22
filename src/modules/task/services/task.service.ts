import { Injectable, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Like } from 'typeorm';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import { TaskDefinitionEntity, TaskStatus, TaskType } from '../entities/task-definition.entity';
import { TaskDefinitionRepository } from '../repositories/task-definition.repository';
import { TaskLogRepository } from '../repositories/task-log.repository';
import { TaskLogEntity, TaskLogStatus } from '../entities/task-log.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { QueryTaskDto } from '../dto/query-task.dto';
import { TaskHandlerRegistry } from './task-handler.registry';
import { TriggerTaskDto } from '../dto/trigger-task.dto';

interface ExecuteOptions {
  manual?: boolean;
  payloadOverride?: Record<string, unknown>;
}

@Injectable()
export class TaskService extends BaseService<TaskDefinitionEntity> implements OnModuleInit {
  protected repository: TaskDefinitionRepository;
  private readonly runningTaskIds = new Set<number>();

  constructor(
    private readonly taskRepository: TaskDefinitionRepository,
    private readonly taskLogRepository: TaskLogRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly handlerRegistry: TaskHandlerRegistry,
    logger: LoggerService,
    cache: CacheService,
  ) {
    super();
    this.repository = taskRepository;
    this.logger = logger;
    this.cache = cache;
    this.logger.setContext(TaskService.name);
  }

  async onModuleInit(): Promise<void> {
    const tasks = await this.taskRepository.findAll({ where: { status: TaskStatus.ENABLED } });
    for (const task of tasks) {
      await this.registerTask(task);
    }
    this.logger?.log(`Initialized scheduler with ${tasks.length} tasks`);
  }

  async createTask(dto: CreateTaskDto): Promise<TaskDefinitionEntity> {
    if (await this.taskRepository.findByCode(dto.code)) {
      throw BusinessException.duplicate('Task', 'code');
    }

    const task = await this.taskRepository.create({
      ...dto,
      schedule: dto.schedule ?? null,
    });

    if (task.status === TaskStatus.ENABLED) {
      await this.registerTask(task);
    }

    return task;
  }

  async updateTask(id: number, dto: UpdateTaskDto): Promise<TaskDefinitionEntity> {
    const task = await this.taskRepository.findByIdOrFail(id);

    if (dto.code && dto.code !== task.code) {
      if (await this.taskRepository.findByCode(dto.code)) {
        throw BusinessException.duplicate('Task', 'code');
      }
    }

    const updated = await this.taskRepository.update(id, {
      ...dto,
      schedule: dto.schedule ?? task.schedule,
    } as any);

    await this.unregisterTask(task.code);
    if (updated.status === TaskStatus.ENABLED) {
      await this.registerTask(updated);
    }

    return updated;
  }

  async toggleTask(id: number, status: TaskStatus): Promise<TaskDefinitionEntity> {
    const task = await this.taskRepository.findByIdOrFail(id);
    const updated = await this.taskRepository.update(id, { status });

    await this.unregisterTask(task.code);
    if (status === TaskStatus.ENABLED) {
      await this.registerTask(updated);
    }

    return updated;
  }

  async findTasks(query: QueryTaskDto) {
    const baseWhere = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const where = query.keyword
      ? [
          { ...baseWhere, code: Like(`%${query.keyword}%`) },
          { ...baseWhere, name: Like(`%${query.keyword}%`) },
        ]
      : [baseWhere];

    return this.taskRepository.paginate(query, {
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async triggerTask(id: number, dto: TriggerTaskDto): Promise<void> {
    const task = await this.taskRepository.findByIdOrFail(id);
    if (!task.allowManual) {
      throw BusinessException.forbidden('该任务不允许手动触发');
    }

    await this.executeTask(task, {
      manual: true,
      payloadOverride: dto.payload,
    });
  }

  async getTaskLogs(taskId: number, limit = 20): Promise<TaskLogEntity[]> {
    await this.taskRepository.findByIdOrFail(taskId);
    return this.taskLogRepository.findRecent(taskId, limit);
  }

  private async registerTask(task: TaskDefinitionEntity): Promise<void> {
    try {
      switch (task.type) {
        case TaskType.CRON:
          this.registerCronTask(task);
          break;
        default:
          throw new Error('Only cron tasks are supported');
      }
    } catch (error) {
      this.logger?.error(
        `Failed to register task ${task.code}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw BusinessException.operationFailed(
        'register task',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async unregisterTask(code: string): Promise<void> {
    try {
      this.schedulerRegistry.deleteCronJob(code);
    } catch (error) {
      /* ignore */
    }
  }

  private registerCronTask(task: TaskDefinitionEntity): void {
    if (!task.schedule) {
      throw new Error('Cron task requires schedule expression');
    }

    const job = new CronJob(task.schedule, async () => {
      await this.executeTask(task);
    });

    this.schedulerRegistry.addCronJob(task.code, job as any);
    job.start();
    const nextRun = job.nextDate().toJSDate();
    this.taskRepository.update(task.id, { nextRunAt: nextRun }).catch(() => undefined);
  }

  /**
   * 🆕 执行任务（带重试机制）
   */
  private async executeTask(
    task: TaskDefinitionEntity,
    options: ExecuteOptions = {},
  ): Promise<void> {
    const freshTask = await this.taskRepository.findById(task.id);
    if (!freshTask || freshTask.status !== TaskStatus.ENABLED) {
      this.logger?.warn(`Skip execution for task ${task.code}, definition missing或已禁用`);
      return;
    }

    if (this.runningTaskIds.has(freshTask.id)) {
      this.logger?.warn(`Task ${freshTask.code} is already running in this process, skip`);
      return;
    }

    this.runningTaskIds.add(freshTask.id);

    try {
      // 获取重试配置
      const retryPolicy = freshTask.retryPolicy || {
        enabled: false,
        maxRetries: 0,
        retryDelay: 60000,
        backoffMultiplier: 2,
      };

      let lastError: Error | null = null;
      const maxAttempts = retryPolicy.enabled ? retryPolicy.maxRetries + 1 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // 如果是重试，等待一段时间（指数退避）
          if (attempt > 1) {
            const delay =
              retryPolicy.retryDelay * Math.pow(retryPolicy.backoffMultiplier || 2, attempt - 2);
            this.logger?.log(
              `⏳ Retrying task ${freshTask.code} (attempt ${attempt}/${maxAttempts}) after ${delay}ms`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // 执行任务（原有逻辑）
          await this.doExecuteTask(freshTask, options, attempt, maxAttempts);

          // ✅ 成功，跳出重试循环
          return;
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxAttempts) {
            this.logger?.warn(
              `⚠️ Task ${freshTask.code} failed on attempt ${attempt}/${maxAttempts}: ${lastError.message}`,
            );
          } else {
            this.logger?.error(
              `❌ Task ${freshTask.code} failed after ${attempt} attempts`,
              lastError.stack,
            );

            // 🆕 发送告警（仅在所有重试都失败后）
            await this.sendTaskFailureAlert(freshTask, lastError, attempt);
          }
        }
      }

      // 所有重试都失败，抛出最后一个错误
      throw lastError!;
    } finally {
      this.runningTaskIds.delete(freshTask.id);
    }
  }

  /**
   * 🆕 实际执行任务的逻辑（从 executeTask 中提取）
   */
  private async doExecuteTask(
    freshTask: TaskDefinitionEntity,
    options: ExecuteOptions,
    attempt: number,
    maxAttempts: number,
  ): Promise<void> {
    const now = new Date();
    let log: TaskLogEntity | null = null;

    try {
      // 记录任务开始
      const logMessage = options.manual
        ? 'Manual trigger'
        : attempt > 1
          ? `Retry attempt ${attempt}/${maxAttempts}`
          : undefined;

      log = await this.taskLogRepository.createAndSave({
        taskId: freshTask.id,
        status: TaskLogStatus.RUNNING,
        message: logMessage,
        startedAt: now,
      });

      const handler = this.handlerRegistry.get(freshTask.handler);
      const payload = options.payloadOverride ?? freshTask.payload ?? {};

      if (!handler) {
        throw new Error(`Handler ${freshTask.handler ?? 'N/A'} not found`);
      }

      // 添加超时控制
      const timeout = freshTask.timeout || 3600000; // 默认1小时
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Task execution timeout')), timeout);
      });

      try {
        await Promise.race([Promise.resolve(handler(payload)), timeoutPromise]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      // ✅ 任务执行成功
      await this.taskLogRepository.update(log.id, {
        status: TaskLogStatus.SUCCESS,
        finishedAt: new Date(),
        message: attempt > 1 ? `Success on retry attempt ${attempt}` : 'Success',
      });

      await this.taskRepository.update(freshTask.id, {
        lastStatus: TaskLogStatus.SUCCESS,
        lastRunAt: now,
        nextRunAt: this.computeNextRun(freshTask),
      });
    } catch (error) {
      // ❌ 任务执行失败
      if (log) {
        await this.taskLogRepository.update(log.id, {
          status: TaskLogStatus.FAILED,
          finishedAt: new Date(),
          message: error instanceof Error ? error.message : String(error),
        });
      }

      await this.taskRepository.update(freshTask.id, {
        lastStatus: TaskLogStatus.FAILED,
        lastRunAt: now,
        nextRunAt: this.computeNextRun(freshTask),
      });

      throw error; // 重新抛出错误，让外层的重试逻辑处理
    }
  }

  private computeNextRun(task: TaskDefinitionEntity): Date | undefined {
    try {
      switch (task.type) {
        case TaskType.CRON: {
          const job = this.schedulerRegistry.getCronJob(task.code);
          return job?.nextDate()?.toJSDate() ?? undefined;
        }
        default:
          return undefined;
      }
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 🆕 发送任务失败告警
   */
  private async sendTaskFailureAlert(
    task: TaskDefinitionEntity,
    error: Error,
    attemptCount: number,
  ): Promise<void> {
    try {
      // 检查任务是否配置了告警
      const alertConfig = task.alertConfig || {
        enabled: true,
        channels: ['log'],
      };

      if (!alertConfig.enabled) {
        return;
      }

      // 检查是否需要在连续失败N次后才告警
      if (alertConfig.onlyOnConsecutiveFailures) {
        const recentLogs = await this.taskLogRepository.findRecent(
          task.id,
          alertConfig.onlyOnConsecutiveFailures,
        );
        const allFailed = recentLogs.every((log) => log.status === TaskLogStatus.FAILED);

        if (!allFailed) {
          this.logger?.debug(`Skip alert for task ${task.code}: not enough consecutive failures`);
          return;
        }
      }

      // 构建告警消息
      const message = this.buildAlertMessage(task, error, attemptCount);

      this.logger?.error(`[Task Alert] ${message}`);
    } catch (alertError) {
      // 告警失败不应该影响主流程
      this.logger?.error(
        'Failed to send task failure alert',
        alertError instanceof Error ? alertError.stack : String(alertError),
      );
    }
  }

  /**
   * 🆕 构建告警消息
   */
  private buildAlertMessage(
    task: TaskDefinitionEntity,
    error: Error,
    attemptCount: number,
  ): string {
    const timestamp = new Date().toISOString();

    return `
⚠️ 任务执行失败告警

📋 任务信息:
  - 任务名称: ${task.name}
  - 任务编码: ${task.code}
  - 任务类型: ${task.type}
  - 失败时间: ${timestamp}

❌ 错误信息:
  ${error.message}

🔄 重试信息:
  - 已尝试次数: ${attemptCount}
  - 最大重试次数: ${task.retryPolicy?.maxRetries || 0}

💡 建议:
  1. 检查任务日志获取详细错误信息
  2. 确认任务配置是否正确
  3. 检查相关服务是否正常运行

🔗 查看详情: /tasks/${task.id}
    `.trim();
  }
}
