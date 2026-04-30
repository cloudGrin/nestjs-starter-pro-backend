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
import { TaskQueryView } from '../dto';
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
    jest.useRealTimers();
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

  function mockActiveFamilyList(id = 2): TaskListEntity {
    const list = Object.assign(new TaskListEntity(), {
      id,
      name: '家庭计划',
      scope: TaskListScope.FAMILY,
      isArchived: false,
    });
    listRepository.findOne.mockResolvedValue(list);
    return list;
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
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 5, status: UserStatus.ACTIVE },
    });
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
        reminderChannels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
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

  it('rejects creating a task in an archived list', async () => {
    const list = Object.assign(new TaskListEntity(), {
      id: 5,
      name: '归档清单',
      scope: TaskListScope.FAMILY,
      isArchived: true,
    });

    listRepository.findOne.mockResolvedValue(list);

    await expect(
      service.createTask(
        {
          title: '不应进入归档',
          listId: 5,
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects creating a task whose reminder time is after the due time', async () => {
    mockActiveFamilyList();

    await expect(
      service.createTask(
        {
          title: '错误提醒时间',
          listId: 2,
          dueAt: '2026-05-01T09:00:00.000Z',
          remindAt: '2026-05-01T10:00:00.000Z',
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects creating a recurring task without a due time', async () => {
    mockActiveFamilyList();

    await expect(
      service.createTask(
        {
          title: '缺少截止时间',
          listId: 2,
          recurrenceType: TaskRecurrenceType.DAILY,
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it.each([
    [TaskRecurrenceType.WEEKLY, 53],
    [TaskRecurrenceType.MONTHLY, 13],
    [TaskRecurrenceType.YEARLY, 11],
  ])(
    'rejects creating %s tasks whose recurrence interval exceeds the product limit',
    async (recurrenceType, recurrenceInterval) => {
      mockActiveFamilyList();
      taskRepository.create.mockImplementation((data) => data as TaskEntity);
      taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

      await expect(
        service.createTask(
          {
            title: '超过重复间隔上限',
            listId: 2,
            dueAt: '2026-05-01T10:00:00.000Z',
            recurrenceType,
            recurrenceInterval,
          },
          { id: 1 } as any,
        ),
      ).rejects.toThrow(BusinessException);
      expect(taskRepository.save).not.toHaveBeenCalled();
    },
  );

  it('rejects creating an anniversary without a due time', async () => {
    mockActiveFamilyList();

    await expect(
      service.createTask(
        {
          title: '缺少纪念日日期',
          listId: 2,
          taskType: TaskType.ANNIVERSARY,
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects enabling external reminders without an external channel', async () => {
    mockActiveFamilyList();

    await expect(
      service.createTask(
        {
          title: '缺少外部渠道',
          listId: 2,
          dueAt: '2026-05-01T10:00:00.000Z',
          reminderChannels: [NotificationChannel.INTERNAL],
          sendExternalReminder: true,
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

  it('resets reminder delivery state when reminder time changes', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 13,
      title: '改提醒时间',
      remindAt: new Date('2026-05-01T09:00:00.000Z'),
      remindedAt: new Date('2026-05-01T09:00:00.000Z'),
      list: Object.assign(new TaskListEntity(), {
        scope: TaskListScope.FAMILY,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.updateTask(
      13,
      {
        remindAt: '2026-05-02T09:00:00.000Z',
      } as any,
      { id: 1 } as any,
    );

    expect(result.remindAt?.toISOString()).toBe('2026-05-02T09:00:00.000Z');
    expect(result.remindedAt).toBeNull();
  });

  it('requires migrating a task out of an archived list before editing it', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 16,
      title: '归档清单任务',
      listId: 8,
      status: TaskStatus.PENDING,
      taskType: TaskType.TASK,
      recurrenceType: TaskRecurrenceType.NONE,
      reminderChannels: [NotificationChannel.INTERNAL],
      sendExternalReminder: false,
      list: Object.assign(new TaskListEntity(), {
        id: 8,
        scope: TaskListScope.FAMILY,
        isArchived: true,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);

    await expect(
      service.updateTask(16, { title: '仍在归档清单' } as any, { id: 1 } as any),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects partial updates that would break strict task date rules', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 17,
      title: '普通任务',
      listId: 2,
      status: TaskStatus.PENDING,
      taskType: TaskType.TASK,
      recurrenceType: TaskRecurrenceType.NONE,
      dueAt: null,
      remindAt: null,
      reminderChannels: [NotificationChannel.INTERNAL],
      sendExternalReminder: false,
      list: Object.assign(new TaskListEntity(), {
        id: 2,
        scope: TaskListScope.FAMILY,
        isArchived: false,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);

    await expect(
      service.updateTask(17, { recurrenceType: TaskRecurrenceType.DAILY } as any, { id: 1 } as any),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects updating a recurrence interval beyond the selected recurrence type limit', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 19,
      title: '每月任务',
      listId: 2,
      status: TaskStatus.PENDING,
      taskType: TaskType.TASK,
      recurrenceType: TaskRecurrenceType.MONTHLY,
      recurrenceInterval: 1,
      dueAt: new Date('2026-05-01T10:00:00.000Z'),
      reminderChannels: [NotificationChannel.INTERNAL],
      sendExternalReminder: false,
      list: Object.assign(new TaskListEntity(), {
        id: 2,
        scope: TaskListScope.FAMILY,
        isArchived: false,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);

    await expect(
      service.updateTask(19, { recurrenceInterval: 13 } as any, { id: 1 } as any),
    ).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('rejects moving a family task into a personal list for normal users', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 14,
      title: '家庭任务',
      listId: 2,
      list: Object.assign(new TaskListEntity(), {
        id: 2,
        scope: TaskListScope.FAMILY,
      }),
    });
    const targetList = Object.assign(new TaskListEntity(), {
      id: 9,
      scope: TaskListScope.PERSONAL,
      ownerId: 1,
    });

    taskRepository.findOne.mockResolvedValue(task);
    listRepository.findOne.mockResolvedValue(targetList);

    await expect(service.updateTask(14, { listId: 9 } as any, { id: 1 } as any)).rejects.toThrow(
      BusinessException,
    );
    expect(taskRepository.save).not.toHaveBeenCalled();
  });

  it('moves an archived task onto the active target list when migrating it', async () => {
    const archivedList = Object.assign(new TaskListEntity(), {
      id: 8,
      scope: TaskListScope.FAMILY,
      isArchived: true,
    });
    const targetList = Object.assign(new TaskListEntity(), {
      id: 9,
      scope: TaskListScope.FAMILY,
      isArchived: false,
    });
    const task = Object.assign(new TaskEntity(), {
      id: 18,
      title: '归档清单任务',
      listId: archivedList.id,
      status: TaskStatus.PENDING,
      taskType: TaskType.TASK,
      recurrenceType: TaskRecurrenceType.NONE,
      reminderChannels: [NotificationChannel.INTERNAL],
      sendExternalReminder: false,
      list: archivedList,
    });

    taskRepository.findOne.mockResolvedValue(task);
    listRepository.findOne.mockResolvedValue(targetList);
    taskRepository.save.mockImplementation(async (data) => data as TaskEntity);

    const result = await service.updateTask(18, { listId: targetList.id } as any, { id: 1 } as any);

    expect(result.listId).toBe(targetList.id);
    expect(result.list).toBe(targetList);
    expect(taskRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        listId: targetList.id,
        list: targetList,
      }),
    );
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

  it('includes recurring task occurrences that fall inside the calendar range', async () => {
    const matchingTask = Object.assign(new TaskEntity(), {
      id: 21,
      title: '每周缴费',
      status: TaskStatus.PENDING,
      recurrenceType: TaskRecurrenceType.WEEKLY,
      recurrenceInterval: 1,
      dueAt: new Date('2026-04-24T10:00:00.000Z'),
      remindAt: null,
    });
    const outOfRangeTask = Object.assign(new TaskEntity(), {
      id: 22,
      title: '年度检查',
      status: TaskStatus.PENDING,
      recurrenceType: TaskRecurrenceType.WEEKLY,
      recurrenceInterval: 52,
      dueAt: new Date('2026-04-30T10:00:00.000Z'),
      remindAt: null,
    });
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([matchingTask, outOfRangeTask]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    taskRepository.createQueryBuilder.mockReturnValue(qb as any);

    const result = await service.findTasks(
      {
        view: TaskQueryView.CALENDAR,
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-31T23:59:59.999Z',
        page: 1,
        limit: 100,
      } as any,
      { id: 1, isSuperAdmin: true } as any,
    );

    expect(result.items).toEqual([matchingTask]);
    expect(result.meta.totalItems).toBe(1);
    expect(qb.getManyAndCount).not.toHaveBeenCalled();
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

  it('rejects assigning inactive users even when the user id exists', async () => {
    mockActiveFamilyList();
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTask(
        {
          title: '指派给禁用用户',
          listId: 2,
          assigneeId: 5,
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { id: 5, status: UserStatus.ACTIVE },
    });
    expect(taskRepository.save).not.toHaveBeenCalled();
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

  it('rejects a duplicate completion right after a recurring task rolls forward', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T10:00:05.000Z'));
    const task = Object.assign(new TaskEntity(), {
      id: 7,
      title: '每周整理冰箱',
      status: TaskStatus.PENDING,
      dueAt: new Date('2026-05-08T10:00:00.000Z'),
      remindAt: new Date('2026-05-08T09:00:00.000Z'),
      recurrenceType: TaskRecurrenceType.WEEKLY,
      recurrenceInterval: 1,
      list: Object.assign(new TaskListEntity(), {
        scope: TaskListScope.FAMILY,
      }),
    });
    const latestCompletion = Object.assign(new TaskCompletionEntity(), {
      taskId: 7,
      completedAt: new Date('2026-05-01T10:00:00.000Z'),
      nextDueAt: new Date('2026-05-08T10:00:00.000Z'),
    });

    mockTaskLookup(task);
    completionRepository.findOne.mockResolvedValue(latestCompletion);

    await expect(service.completeTask(7, 7, { id: 7 } as any)).rejects.toThrow(BusinessException);
    expect(completionRepository.save).not.toHaveBeenCalled();
    expect(taskRepository.save).not.toHaveBeenCalled();
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

  it('rejects reopening a task that is not completed', async () => {
    const task = Object.assign(new TaskEntity(), {
      id: 15,
      title: '仍是待办',
      status: TaskStatus.PENDING,
      remindedAt: new Date('2026-05-01T09:00:00.000Z'),
      list: Object.assign(new TaskListEntity(), {
        scope: TaskListScope.FAMILY,
      }),
    });

    taskRepository.findOne.mockResolvedValue(task);

    await expect(service.reopenTask(15, { id: 1 } as any)).rejects.toThrow(BusinessException);
    expect(taskRepository.save).not.toHaveBeenCalled();
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
