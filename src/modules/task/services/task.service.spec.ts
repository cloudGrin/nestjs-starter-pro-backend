import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { createMockRepository, createMockLogger } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { TaskEntity, TaskRecurrenceType, TaskStatus, TaskType } from '../entities/task.entity';
import { TaskListEntity, TaskListScope } from '../entities/task-list.entity';
import { TaskCompletionEntity } from '../entities/task-completion.entity';
import { TaskService } from './task.service';
import { NotificationChannel } from '~/modules/notification/entities/notification.entity';
import { UserStatus } from '~/common/enums/user.enum';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: jest.Mocked<Repository<TaskEntity>>;
  let listRepository: jest.Mocked<Repository<TaskListEntity>>;
  let completionRepository: jest.Mocked<Repository<TaskCompletionEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: getRepositoryToken(TaskEntity), useValue: createMockRepository<TaskEntity>() },
        {
          provide: getRepositoryToken(TaskListEntity),
          useValue: createMockRepository<TaskListEntity>(),
        },
        {
          provide: getRepositoryToken(TaskCompletionEntity),
          useValue: createMockRepository<TaskCompletionEntity>(),
        },
        { provide: getRepositoryToken(UserEntity), useValue: createMockRepository<UserEntity>() },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (callback) =>
              callback({
                getRepository: (entity: unknown) => {
                  if (entity === TaskEntity) {
                    return taskRepository;
                  }

                  if (entity === TaskCompletionEntity) {
                    return completionRepository;
                  }

                  return null;
                },
              }),
            ),
          },
        },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(TaskService);
    taskRepository = module.get(getRepositoryToken(TaskEntity));
    listRepository = module.get(getRepositoryToken(TaskListEntity));
    completionRepository = module.get(getRepositoryToken(TaskCompletionEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function mockTaskLookup(task: TaskEntity): void {
    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(task),
    } as any);
  }

  it('creates a family task assigned to an existing user', async () => {
    const list = Object.assign(new TaskListEntity(), {
      id: 2,
      name: '家庭计划',
      scope: TaskListScope.FAMILY,
    });
    const assignee = Object.assign(new UserEntity(), { id: 5, username: 'family-user' });
    const savedTask = Object.assign(new TaskEntity(), {
      id: 10,
      title: '每周整理冰箱',
      listId: 2,
      creatorId: 1,
      assigneeId: 5,
      status: TaskStatus.PENDING,
    });

    listRepository.findOne.mockResolvedValue(list);
    userRepository.findOne.mockResolvedValue(assignee);
    taskRepository.create.mockImplementation((data) => data as TaskEntity);
    taskRepository.save.mockResolvedValue(savedTask);

    const result = await service.createTask(
      {
        title: '每周整理冰箱',
        listId: 2,
        assigneeId: 5,
        dueAt: '2026-05-01T10:00:00.000Z',
        remindAt: '2026-05-01T09:00:00.000Z',
        important: true,
        urgent: false,
        tags: ['family'],
        taskType: TaskType.TASK,
        recurrenceType: TaskRecurrenceType.WEEKLY,
        reminderChannels: [NotificationChannel.BARK],
        sendExternalReminder: true,
      },
      { id: 1 } as any,
    );

    expect(result).toEqual(savedTask);
    expect(listRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(taskRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '每周整理冰箱',
        listId: 2,
        creatorId: 1,
        assigneeId: 5,
        status: TaskStatus.PENDING,
        important: true,
        urgent: false,
        tags: ['family'],
        recurrenceType: TaskRecurrenceType.WEEKLY,
        reminderChannels: [NotificationChannel.BARK],
        sendExternalReminder: true,
      }),
    );
  });

  it('rejects creating a task in another user personal list', async () => {
    const list = Object.assign(new TaskListEntity(), {
      id: 3,
      name: '别人的个人清单',
      scope: TaskListScope.PERSONAL,
      ownerId: 9,
    });

    listRepository.findOne.mockResolvedValue(list);

    await expect(
      service.createTask(
        {
          title: '越权任务',
          listId: 3,
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects reading another user personal task', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 8,
      title: '私人任务',
      creatorId: 9,
      assigneeId: 9,
      list: Object.assign(new TaskListEntity(), {
        id: 4,
        scope: TaskListScope.PERSONAL,
        ownerId: 9,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);

    await expect((service as any).findTask(8, { id: 1 })).rejects.toThrow(BusinessException);
  });

  it('includes personal list ownership in list visibility', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    taskRepository.createQueryBuilder.mockReturnValue(qb as any);

    await service.findTasks({}, { id: 3 } as any);

    expect(qb.where).toHaveBeenCalledWith(
      expect.stringContaining('list.ownerId = :currentUserId'),
      expect.objectContaining({
        currentUserId: 3,
        familyScope: TaskListScope.FAMILY,
      }),
    );
  });

  it('updates nullable task fields to null when clearing an existing task', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 12,
      title: '清理字段',
      description: '旧描述',
      assigneeId: 5,
      dueAt: new Date('2026-05-01T10:00:00.000Z'),
      remindAt: new Date('2026-05-01T09:00:00.000Z'),
      list: Object.assign(new TaskListEntity(), {
        scope: TaskListScope.FAMILY,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.updateTask(
      12,
      {
        description: null,
        assigneeId: null,
        dueAt: null,
        remindAt: null,
      } as any,
      { id: 1 } as any,
    );

    expect(result.description).toBeNull();
    expect(result.assigneeId).toBeNull();
    expect(result.dueAt).toBeNull();
    expect(result.remindAt).toBeNull();
    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('filters tasks by taskId for notification deep links', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    taskRepository.createQueryBuilder.mockReturnValue(qb as any);

    await service.findTasks({ taskId: 42, page: 1, limit: 10 } as any, { id: 1 } as any);

    expect(qb.andWhere).toHaveBeenCalledWith('task.id = :taskId', { taskId: 42 });
  });

  it('returns active assignee options without requiring user management permissions', async () => {
    const assignee = Object.assign(new UserEntity(), {
      id: 5,
      username: 'family-user',
      nickname: 'Family',
      realName: 'Family User',
      status: UserStatus.ACTIVE,
    });
    userRepository.find.mockResolvedValue([assignee]);

    const result = await service.findAssigneeOptions();

    expect(userRepository.find).toHaveBeenCalledWith({
      where: { status: UserStatus.ACTIVE },
      select: ['id', 'username', 'nickname', 'realName'],
      order: { id: 'ASC' },
    });
    expect(result).toEqual([assignee]);
  });

  it('rolls a recurring task forward and records the completed occurrence', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 1,
      title: '每周整理冰箱',
      status: TaskStatus.PENDING,
      dueAt: new Date('2026-05-01T10:00:00.000Z'),
      remindAt: new Date('2026-05-01T09:00:00.000Z'),
      remindedAt: new Date('2026-05-01T09:00:00.000Z'),
      recurrenceType: TaskRecurrenceType.WEEKLY,
      recurrenceInterval: 1,
    });

    mockTaskLookup(task);
    completionRepository.create.mockImplementation((data) => data as TaskCompletionEntity);
    completionRepository.save.mockImplementation(async (data) => data as TaskCompletionEntity);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.completeTask(1, 7);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(completionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 1,
        completedById: 7,
        occurrenceDueAt: new Date('2026-05-01T10:00:00.000Z'),
      }),
    );
    expect(result.status).toBe(TaskStatus.PENDING);
    expect(result.dueAt?.toISOString()).toBe('2026-05-08T10:00:00.000Z');
    expect(result.remindAt?.toISOString()).toBe('2026-05-08T09:00:00.000Z');
    expect(result.remindedAt).toBeNull();
  });

  it('rolls a recurring reminder-only task forward instead of reminding again immediately', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 4,
      title: '吃药',
      status: TaskStatus.PENDING,
      dueAt: null,
      remindAt: new Date('2026-05-01T09:00:00.000Z'),
      remindedAt: new Date('2026-05-01T09:00:00.000Z'),
      recurrenceType: TaskRecurrenceType.DAILY,
      recurrenceInterval: 1,
      list: Object.assign(new TaskListEntity(), {
        scope: TaskListScope.FAMILY,
      }),
    });

    mockTaskLookup(task);
    completionRepository.create.mockImplementation((data) => data as TaskCompletionEntity);
    completionRepository.save.mockImplementation(async (data) => data as TaskCompletionEntity);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.completeTask(4, 7);

    expect(result.dueAt).toBeNull();
    expect(result.remindAt?.toISOString()).toBe('2026-05-02T09:00:00.000Z');
    expect(result.remindedAt).toBeNull();
  });

  it('marks a non-recurring task as completed', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 2,
      title: '一次性任务',
      status: TaskStatus.PENDING,
      dueAt: new Date('2026-05-01T10:00:00.000Z'),
      recurrenceType: TaskRecurrenceType.NONE,
    });

    mockTaskLookup(task);
    completionRepository.create.mockImplementation((data) => data as TaskCompletionEntity);
    completionRepository.save.mockImplementation(async (data) => data as TaskCompletionEntity);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.completeTask(2, 7);

    expect(result.status).toBe(TaskStatus.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(completionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 2,
        completedById: 7,
        occurrenceDueAt: new Date('2026-05-01T10:00:00.000Z'),
      }),
    );
  });

  it('locks the task row before completing it', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 6,
      title: '并发任务',
      status: TaskStatus.PENDING,
      recurrenceType: TaskRecurrenceType.NONE,
    });

    mockTaskLookup(task);
    completionRepository.create.mockImplementation((data) => data as TaskCompletionEntity);
    completionRepository.save.mockImplementation(async (data) => data as TaskCompletionEntity);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    await service.completeTask(6, 7);

    const qb = taskRepository.createQueryBuilder.mock.results[0].value;
    expect(qb.setLock).toHaveBeenCalledWith('pessimistic_write');
  });
});
