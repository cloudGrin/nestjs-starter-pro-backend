import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Equal, In, LessThan, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  AutomationTaskConfigEntity,
  AutomationTaskLastStatus,
} from '../entities/automation-task-config.entity';
import {
  AutomationTaskLogEntity,
  AutomationTaskLogStatus,
  AutomationTaskTriggerType,
} from '../entities/automation-task-log.entity';
import { AutomationTaskParams } from '../types/automation-task.types';
import { AutomationTaskRegistryService } from './automation-task-registry.service';

const LOG_RETENTION_LIMIT = 1000;
const INTERRUPTED_MESSAGE = '服务重启前任务中断';

@Injectable()
export class AutomationTaskExecutorService {
  constructor(
    @InjectRepository(AutomationTaskConfigEntity)
    private readonly configRepository: Repository<AutomationTaskConfigEntity>,
    @InjectRepository(AutomationTaskLogEntity)
    private readonly logRepository: Repository<AutomationTaskLogEntity>,
    private readonly registry: AutomationTaskRegistryService,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    taskKey: string,
    triggerType: AutomationTaskTriggerType,
  ): Promise<AutomationTaskLogEntity> {
    const definition = this.registry.getDefinitionOrThrow(taskKey);
    const config = await this.configRepository.findOne({ where: { taskKey } });

    if (!config) {
      throw new NotFoundException('自动化任务配置不存在');
    }

    if (config.isRunning) {
      return this.recordSkipped(config, triggerType);
    }

    const startedAt = new Date();
    const claim = await this.configRepository.update(
      { id: config.id, isRunning: false },
      {
        isRunning: true,
        lastStatus: AutomationTaskLastStatus.RUNNING,
        lastStartedAt: startedAt,
        lastFinishedAt: null,
        lastDurationMs: null,
        lastMessage: null,
        lastError: null,
      },
    );

    if (!claim.affected) {
      return this.recordSkipped(config, triggerType);
    }

    let params: AutomationTaskParams = this.normalizeParams(config.params);

    try {
      params = definition.validateParams ? definition.validateParams(params) : params;
      const result = await definition.handler(params);
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const message = this.limitMessage(result?.message || '执行成功');
      const log = await this.saveLog({
        taskKey,
        triggerType,
        status: AutomationTaskLogStatus.SUCCESS,
        startedAt,
        finishedAt,
        durationMs,
        paramsSnapshot: params,
        resultMessage: message,
      });

      await this.configRepository.update(config.id, {
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.SUCCESS,
        lastFinishedAt: finishedAt,
        lastDurationMs: durationMs,
        lastMessage: message,
        lastError: null,
      });
      await this.pruneLogs(taskKey);
      return log;
    } catch (error) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const message = this.errorMessage(error);
      const log = await this.saveLog({
        taskKey,
        triggerType,
        status: AutomationTaskLogStatus.FAILED,
        startedAt,
        finishedAt,
        durationMs,
        paramsSnapshot: params,
        errorMessage: message,
      });

      await this.configRepository.update(config.id, {
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.FAILED,
        lastFinishedAt: finishedAt,
        lastDurationMs: durationMs,
        lastMessage: null,
        lastError: message,
      });
      this.logger.error(`Automation task "${taskKey}" failed: ${message}`);
      await this.pruneLogs(taskKey);
      return log;
    }
  }

  async recoverInterruptedTasks(): Promise<void> {
    const runningConfigs = await this.configRepository.find({ where: { isRunning: true } });

    for (const config of runningConfigs) {
      const finishedAt = new Date();
      const startedAt = config.lastStartedAt ?? finishedAt;
      const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());

      await this.saveLog({
        taskKey: config.taskKey,
        triggerType: AutomationTaskTriggerType.SYSTEM,
        status: AutomationTaskLogStatus.FAILED,
        startedAt,
        finishedAt,
        durationMs,
        paramsSnapshot: this.normalizeParams(config.params),
        errorMessage: INTERRUPTED_MESSAGE,
      });
      await this.configRepository.update(config.id, {
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.FAILED,
        lastFinishedAt: finishedAt,
        lastDurationMs: durationMs,
        lastMessage: null,
        lastError: INTERRUPTED_MESSAGE,
      });
      await this.pruneLogs(config.taskKey);
    }
  }

  private async recordSkipped(
    config: AutomationTaskConfigEntity,
    triggerType: AutomationTaskTriggerType,
  ): Promise<AutomationTaskLogEntity> {
    const now = new Date();
    const message = '任务正在运行，本次触发已跳过';
    const log = await this.saveLog({
      taskKey: config.taskKey,
      triggerType,
      status: AutomationTaskLogStatus.SKIPPED,
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      paramsSnapshot: this.normalizeParams(config.params),
      resultMessage: message,
    });

    await this.configRepository.update(config.id, {
      lastStatus: AutomationTaskLastStatus.SKIPPED,
      lastMessage: message,
      lastError: null,
    });
    await this.pruneLogs(config.taskKey);
    return log;
  }

  private async saveLog(input: Partial<AutomationTaskLogEntity>): Promise<AutomationTaskLogEntity> {
    const log = this.logRepository.create(input);
    return this.logRepository.save(log);
  }

  private async pruneLogs(taskKey: string): Promise<void> {
    const retainedLogs = await this.logRepository.find({
      where: { taskKey },
      select: ['id', 'createdAt'],
      order: { createdAt: 'DESC', id: 'DESC' },
      take: LOG_RETENTION_LIMIT,
    });

    if (retainedLogs.length < LOG_RETENTION_LIMIT) {
      return;
    }

    const oldestRetainedLog = retainedLogs[retainedLogs.length - 1];
    const staleLogs = await this.logRepository.find({
      select: ['id'],
      where: [
        { taskKey, createdAt: LessThan(oldestRetainedLog.createdAt) },
        {
          taskKey,
          createdAt: Equal(oldestRetainedLog.createdAt),
          id: LessThan(oldestRetainedLog.id),
        },
      ],
    });

    if (staleLogs.length > 0) {
      await this.logRepository.delete({ id: In(staleLogs.map((log) => log.id)) });
    }
  }

  private normalizeParams(params?: Record<string, unknown> | null): AutomationTaskParams {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return {};
    }

    return params;
  }

  private errorMessage(error: unknown): string {
    return this.limitMessage(error instanceof Error ? error.message : String(error));
  }

  private limitMessage(message: string): string {
    return message.slice(0, 500);
  }
}
