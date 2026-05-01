import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { createMockLogger, createMockRepository } from '~/test-utils';
import {
  AutomationTaskConfigEntity,
  AutomationTaskLastStatus,
} from '../entities/automation-task-config.entity';
import {
  AutomationTaskLogEntity,
  AutomationTaskLogStatus,
  AutomationTaskTriggerType,
} from '../entities/automation-task-log.entity';
import { AutomationTaskRegistryService } from './automation-task-registry.service';
import { AutomationTaskExecutorService } from './automation-task-executor.service';

describe('AutomationTaskExecutorService', () => {
  let service: AutomationTaskExecutorService;
  let configRepository: any;
  let logRepository: any;
  let registry: jest.Mocked<Pick<AutomationTaskRegistryService, 'getDefinitionOrThrow'>>;

  const createConfig = (
    overrides?: Partial<AutomationTaskConfigEntity>,
  ): AutomationTaskConfigEntity =>
    Object.assign(new AutomationTaskConfigEntity(), {
      id: 1,
      taskKey: 'demoTask',
      enabled: true,
      cronExpression: '* * * * *',
      params: { limit: 2 },
      isRunning: false,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      ...overrides,
    });

  beforeEach(async () => {
    configRepository = createMockRepository<AutomationTaskConfigEntity>();
    logRepository = createMockRepository<AutomationTaskLogEntity>();
    registry = {
      getDefinitionOrThrow: jest.fn(),
    };

    logRepository.create.mockImplementation((input: Partial<AutomationTaskLogEntity>) =>
      Object.assign(new AutomationTaskLogEntity(), input),
    );
    logRepository.save.mockImplementation(async (log: AutomationTaskLogEntity) =>
      Object.assign(log, {
        id: log.id ?? 10,
        createdAt: log.createdAt ?? new Date('2026-05-01T00:00:01.000Z'),
        updatedAt: log.updatedAt ?? new Date('2026-05-01T00:00:01.000Z'),
      }),
    );
    logRepository.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTaskExecutorService,
        { provide: getRepositoryToken(AutomationTaskConfigEntity), useValue: configRepository },
        { provide: getRepositoryToken(AutomationTaskLogEntity), useValue: logRepository },
        { provide: AutomationTaskRegistryService, useValue: registry },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(AutomationTaskExecutorService);
  });

  it('executes a registered task, records a success log, and updates latest status', async () => {
    const handler = jest.fn().mockResolvedValue({ message: 'processed 2 records' });
    registry.getDefinitionOrThrow.mockReturnValue({
      key: 'demoTask',
      name: 'Demo Task',
      defaultCron: '* * * * *',
      defaultEnabled: true,
      defaultParams: {},
      validateParams: (params) => ({ limit: Number(params.limit) }),
      handler,
    });
    configRepository.findOne.mockResolvedValue(createConfig());
    configRepository.update.mockResolvedValue({ affected: 1 });

    const log = await service.execute('demoTask', AutomationTaskTriggerType.MANUAL);

    expect(handler).toHaveBeenCalledWith({ limit: 2 });
    expect(log.status).toBe(AutomationTaskLogStatus.SUCCESS);
    expect(log.resultMessage).toBe('processed 2 records');
    expect(configRepository.update).toHaveBeenNthCalledWith(
      1,
      { id: 1, isRunning: false },
      expect.objectContaining({
        isRunning: true,
        lastStartedAt: expect.any(Date),
        lastError: null,
      }),
    );
    expect(configRepository.update).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.SUCCESS,
        lastMessage: 'processed 2 records',
        lastError: null,
      }),
    );
  });

  it('records a failed log and returns it when a task handler throws', async () => {
    registry.getDefinitionOrThrow.mockReturnValue({
      key: 'demoTask',
      name: 'Demo Task',
      defaultCron: '* * * * *',
      handler: jest.fn().mockRejectedValue(new Error('remote service failed')),
    });
    configRepository.findOne.mockResolvedValue(createConfig());
    configRepository.update.mockResolvedValue({ affected: 1 });

    const log = await service.execute('demoTask', AutomationTaskTriggerType.SCHEDULE);

    expect(log.status).toBe(AutomationTaskLogStatus.FAILED);
    expect(log.errorMessage).toBe('remote service failed');
    expect(configRepository.update).toHaveBeenLastCalledWith(
      1,
      expect.objectContaining({
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.FAILED,
        lastError: 'remote service failed',
      }),
    );
  });

  it('prunes old logs without using offset-only queries', async () => {
    const handler = jest.fn().mockResolvedValue({ message: 'processed 2 records' });
    const retainedLogs = Array.from({ length: 1000 }, (_, index) =>
      Object.assign(new AutomationTaskLogEntity(), {
        id: 1001 - index,
        taskKey: 'demoTask',
        createdAt: new Date(Date.UTC(2026, 4, 1, 0, 0, index)),
      }),
    );
    registry.getDefinitionOrThrow.mockReturnValue({
      key: 'demoTask',
      name: 'Demo Task',
      defaultCron: '* * * * *',
      handler,
    });
    configRepository.findOne.mockResolvedValue(createConfig());
    configRepository.update.mockResolvedValue({ affected: 1 });
    logRepository.find
      .mockResolvedValueOnce(retainedLogs)
      .mockResolvedValueOnce([Object.assign(new AutomationTaskLogEntity(), { id: 1 })]);

    await service.execute('demoTask', AutomationTaskTriggerType.MANUAL);

    expect(logRepository.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 1000,
      }),
    );
    expect(logRepository.find.mock.calls[0][0]).not.toHaveProperty('skip');
    expect(logRepository.delete).toHaveBeenCalledWith({ id: expect.any(Object) });
  });

  it('records a skipped log instead of running a task that is already running', async () => {
    const handler = jest.fn();
    const runningStartedAt = new Date('2026-05-01T00:00:00.000Z');
    registry.getDefinitionOrThrow.mockReturnValue({
      key: 'demoTask',
      name: 'Demo Task',
      defaultCron: '* * * * *',
      handler,
    });
    configRepository.findOne.mockResolvedValue(
      createConfig({
        isRunning: true,
        lastStatus: AutomationTaskLastStatus.RUNNING,
        lastStartedAt: runningStartedAt,
        lastFinishedAt: null,
        lastDurationMs: null,
      }),
    );

    const log = await service.execute('demoTask', AutomationTaskTriggerType.MANUAL);

    expect(handler).not.toHaveBeenCalled();
    expect(log.status).toBe(AutomationTaskLogStatus.SKIPPED);
    expect(log.resultMessage).toContain('正在运行');
    const updatePayload = configRepository.update.mock.calls[0][1];
    expect(configRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        lastStatus: AutomationTaskLastStatus.SKIPPED,
      }),
    );
    expect(updatePayload).not.toHaveProperty('lastStartedAt');
    expect(updatePayload).not.toHaveProperty('lastFinishedAt');
    expect(updatePayload).not.toHaveProperty('lastDurationMs');
  });

  it('marks interrupted running tasks as failed on startup and writes a system log', async () => {
    configRepository.find.mockResolvedValue([
      createConfig({
        isRunning: true,
        lastStartedAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ]);

    await service.recoverInterruptedTasks();

    expect(logRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        taskKey: 'demoTask',
        triggerType: AutomationTaskTriggerType.SYSTEM,
        status: AutomationTaskLogStatus.FAILED,
        errorMessage: '服务重启前任务中断',
      }),
    );
    expect(configRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        isRunning: false,
        lastStatus: AutomationTaskLastStatus.FAILED,
        lastError: '服务重启前任务中断',
      }),
    );
  });
});
