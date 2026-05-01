import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { validateCronExpression } from 'cron';
import { FindOptionsWhere, Repository } from 'typeorm';
import { PaginationResult } from '~/common/types/pagination.types';
import { AutomationTaskConfigEntity } from '../entities/automation-task-config.entity';
import {
  AutomationTaskLogEntity,
  AutomationTaskTriggerType,
} from '../entities/automation-task-log.entity';
import { UpdateAutomationTaskConfigDto } from '../dto/update-automation-task-config.dto';
import { QueryAutomationTaskLogsDto } from '../dto/query-automation-task-logs.dto';
import { AutomationTaskRegistryService } from './automation-task-registry.service';
import { AutomationTaskExecutorService } from './automation-task-executor.service';

const LOG_SORT_FIELDS = new Set(['createdAt', 'startedAt', 'finishedAt', 'durationMs', 'status']);

@Injectable()
export class AutomationTaskService {
  constructor(
    @InjectRepository(AutomationTaskConfigEntity)
    private readonly configRepository: Repository<AutomationTaskConfigEntity>,
    @InjectRepository(AutomationTaskLogEntity)
    private readonly logRepository: Repository<AutomationTaskLogEntity>,
    private readonly registry: AutomationTaskRegistryService,
    private readonly executor: AutomationTaskExecutorService,
  ) {}

  async ensureDefaultConfigs(): Promise<void> {
    for (const definition of this.registry.getDefinitions()) {
      const existing = await this.configRepository.findOne({
        where: { taskKey: definition.key },
      });

      if (existing) {
        continue;
      }

      const defaultParams = this.validateDefinitionParams(
        definition.key,
        definition.defaultParams ?? {},
      );

      await this.configRepository.save(
        this.configRepository.create({
          taskKey: definition.key,
          enabled: definition.defaultEnabled ?? true,
          cronExpression: definition.defaultCron,
          params: defaultParams,
        }),
      );
    }
  }

  async findTasks() {
    await this.ensureDefaultConfigs();
    const configs = await this.configRepository.find();
    const configByKey = new Map(configs.map((config) => [config.taskKey, config]));

    return this.registry.getDefinitions().map((definition) => ({
      key: definition.key,
      name: definition.name,
      description: definition.description,
      defaultCron: definition.defaultCron,
      config: configByKey.get(definition.key) ?? null,
    }));
  }

  async updateConfig(
    taskKey: string,
    dto: UpdateAutomationTaskConfigDto,
  ): Promise<AutomationTaskConfigEntity> {
    await this.ensureDefaultConfigs();
    const definition = this.registry.getDefinitionOrThrow(taskKey);
    const config = await this.findConfigOrThrow(taskKey);
    const patch: Partial<AutomationTaskConfigEntity> = {};

    if (dto.enabled !== undefined) {
      patch.enabled = dto.enabled;
    }

    if (dto.cronExpression !== undefined) {
      this.ensureValidCron(dto.cronExpression);
      patch.cronExpression = dto.cronExpression;
    }

    if (dto.params !== undefined) {
      patch.params = definition.validateParams ? definition.validateParams(dto.params) : dto.params;
    }

    Object.assign(config, patch);
    return this.configRepository.save(config);
  }

  async runTask(taskKey: string): Promise<AutomationTaskLogEntity> {
    await this.ensureDefaultConfigs();
    return this.executor.execute(taskKey, AutomationTaskTriggerType.MANUAL);
  }

  async findLogs(
    taskKey: string,
    query: QueryAutomationTaskLogsDto,
  ): Promise<PaginationResult<AutomationTaskLogEntity>> {
    this.registry.getDefinitionOrThrow(taskKey);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: FindOptionsWhere<AutomationTaskLogEntity> = { taskKey };

    if (query.status) {
      where.status = query.status;
    }
    if (query.triggerType) {
      where.triggerType = query.triggerType;
    }

    const sort = query.sort && LOG_SORT_FIELDS.has(query.sort) ? query.sort : 'createdAt';
    const order = query.order ?? 'DESC';
    const [items, totalItems] = await this.logRepository.findAndCount({
      where,
      order: { [sort]: order } as any,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findEnabledConfigs(): Promise<AutomationTaskConfigEntity[]> {
    await this.ensureDefaultConfigs();
    return this.configRepository.find({ where: { enabled: true } });
  }

  private async findConfigOrThrow(taskKey: string): Promise<AutomationTaskConfigEntity> {
    const config = await this.configRepository.findOne({ where: { taskKey } });
    if (!config) {
      throw new NotFoundException('自动化任务配置不存在');
    }

    return config;
  }

  private validateDefinitionParams(taskKey: string, params: Record<string, unknown>) {
    const definition = this.registry.getDefinitionOrThrow(taskKey);
    return definition.validateParams ? definition.validateParams(params) : params;
  }

  private ensureValidCron(cronExpression: string): void {
    const result = validateCronExpression(cronExpression);
    if (!result.valid) {
      throw new BadRequestException(result.error?.message || 'Cron 表达式无效');
    }
  }
}
