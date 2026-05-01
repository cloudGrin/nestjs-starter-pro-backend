import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '~/test-utils';
import { AutomationTaskConfigEntity } from '../entities/automation-task-config.entity';
import { AutomationTaskLogEntity } from '../entities/automation-task-log.entity';
import { QueryAutomationTaskLogsDto } from '../dto/query-automation-task-logs.dto';
import { AutomationTaskExecutorService } from './automation-task-executor.service';
import { AutomationTaskRegistryService } from './automation-task-registry.service';
import { AutomationTaskService } from './automation-task.service';

describe('AutomationTaskService', () => {
  let service: AutomationTaskService;
  let logRepository: any;
  let registry: jest.Mocked<
    Pick<AutomationTaskRegistryService, 'getDefinitions' | 'getDefinitionOrThrow'>
  >;

  beforeEach(async () => {
    const configRepository = createMockRepository<AutomationTaskConfigEntity>();
    logRepository = createMockRepository<AutomationTaskLogEntity>();
    registry = {
      getDefinitions: jest.fn().mockReturnValue([]),
      getDefinitionOrThrow: jest.fn().mockReturnValue({
        key: 'demoTask',
        name: 'Demo Task',
        defaultCron: '* * * * *',
        handler: jest.fn(),
      }),
    };

    logRepository.findAndCount.mockResolvedValue([[], 0]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTaskService,
        { provide: getRepositoryToken(AutomationTaskConfigEntity), useValue: configRepository },
        { provide: getRepositoryToken(AutomationTaskLogEntity), useValue: logRepository },
        { provide: AutomationTaskRegistryService, useValue: registry },
        { provide: AutomationTaskExecutorService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get(AutomationTaskService);
  });

  it('defaults automation logs to newest first through the query dto default', async () => {
    await service.findLogs('demoTask', new QueryAutomationTaskLogsDto());

    expect(logRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      }),
    );
  });
});
