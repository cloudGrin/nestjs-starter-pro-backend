import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import { TaskEntity } from '../entities/task.entity';
import { TaskListEntity, TaskListScope } from '../entities/task-list.entity';
import { TaskListService } from './task-list.service';

describe('TaskListService', () => {
  let service: TaskListService;
  let repository: jest.Mocked<Repository<TaskListEntity>>;
  let taskRepository: jest.Mocked<Repository<TaskEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskListService,
        {
          provide: getRepositoryToken(TaskListEntity),
          useValue: createMockRepository<TaskListEntity>(),
        },
        {
          provide: getRepositoryToken(TaskEntity),
          useValue: createMockRepository<TaskEntity>(),
        },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(TaskListService);
    repository = module.get(getRepositoryToken(TaskListEntity));
    taskRepository = module.get(getRepositoryToken(TaskEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates personal active lists by default in the service layer', async () => {
    const saved = Object.assign(new TaskListEntity(), {
      id: 1,
      name: '默认清单',
      scope: TaskListScope.PERSONAL,
      sort: 0,
      isArchived: false,
      ownerId: 3,
    });
    repository.create.mockImplementation((data) => data as TaskListEntity);
    repository.save.mockResolvedValue(saved);

    await service.createList({ name: '默认清单' }, { id: 3 });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '默认清单',
        scope: TaskListScope.PERSONAL,
        sort: 0,
        isArchived: false,
        ownerId: 3,
      }),
    );
  });

  it('limits normal users to family lists and their own personal lists', async () => {
    repository.find.mockResolvedValue([]);

    await service.findLists({ id: 3 } as any);

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ scope: TaskListScope.FAMILY }, { scope: TaskListScope.PERSONAL, ownerId: 3 }],
      }),
    );
  });

  it('rejects updating another user personal list', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new TaskListEntity(), {
        id: 9,
        scope: TaskListScope.PERSONAL,
        ownerId: 8,
      }),
    );

    await expect((service as any).updateList(9, { name: '越权' }, { id: 3 })).rejects.toThrow(
      BusinessException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects deleting a non-empty list', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new TaskListEntity(), {
        id: 4,
        scope: TaskListScope.FAMILY,
      }),
    );
    taskRepository.count.mockResolvedValue(1);

    await expect((service as any).removeList(4, { id: 3 })).rejects.toThrow(BusinessException);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
