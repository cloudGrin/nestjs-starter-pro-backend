import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CronJob } from 'cron';
import { TaskService } from './task.service';
import { TaskDefinitionRepository } from '../repositories/task-definition.repository';
import { TaskLogRepository } from '../repositories/task-log.repository';
import { TaskHandlerRegistry } from './task-handler.registry';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import {
  TaskDefinitionEntity,
  TaskStatus,
  TaskType,
} from '../entities/task-definition.entity';
import { TaskLogStatus } from '../entities/task-log.entity';
import { BusinessException } from '~/common/exceptions/business.exception';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: jest.Mocked<TaskDefinitionRepository>;
  let taskLogRepository: jest.Mocked<TaskLogRepository>;
  let schedulerRegistry: jest.Mocked<SchedulerRegistry>;
  let handlerRegistry: jest.Mocked<TaskHandlerRegistry>;
  let logger: jest.Mocked<LoggerService>;
  let cache: jest.Mocked<CacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockTaskRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByIdOrFail: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      paginate: jest.fn(),
    };

    const mockTaskLogRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      cleanupOldLogs: jest.fn(),
    };

    // Mock CronJob
    const mockCronJob = {
      start: jest.fn(),
      stop: jest.fn(),
      nextDate: jest.fn().mockReturnValue({
        toJSDate: () => new Date(),
      }),
    };

    const mockSchedulerRegistry = {
      addCronJob: jest.fn(),
      addInterval: jest.fn(),
      addTimeout: jest.fn(),
      deleteCronJob: jest.fn(),
      deleteInterval: jest.fn(),
      deleteTimeout: jest.fn(),
      getCronJob: jest.fn().mockReturnValue(mockCronJob),
    };

    const mockHandlerRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      getHandler: jest.fn(),
      hasHandler: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      acquireLock: jest.fn().mockResolvedValue('lock-id'),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: TaskDefinitionRepository, useValue: mockTaskRepository },
        { provide: TaskLogRepository, useValue: mockTaskLogRepository },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        { provide: TaskHandlerRegistry, useValue: mockHandlerRegistry },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCache },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get(TaskDefinitionRepository);
    taskLogRepository = module.get(TaskLogRepository);
    schedulerRegistry = module.get(SchedulerRegistry);
    handlerRegistry = module.get(TaskHandlerRegistry);
    logger = module.get(LoggerService);
    cache = module.get(CacheService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('配置和初始化', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
      expect(logger.setContext).toHaveBeenCalledWith('TaskService');
    });

    it('onModuleInit 应该注册系统内置处理器', async () => {
      taskRepository.findAll.mockResolvedValue([]);

      await service.onModuleInit();

      expect(handlerRegistry.register).toHaveBeenCalledWith(
        'system:cleanup-task-logs',
        expect.any(Function),
      );
    });

    it('onModuleInit 应该加载并注册启用的任务', async () => {
      const enabledTasks = [
        {
          id: 1,
          code: 'task-1',
          name: 'Test Task 1',
          type: TaskType.CRON,
          schedule: '0 0 * * *',
          status: TaskStatus.ENABLED,
        } as TaskDefinitionEntity,
      ];

      taskRepository.findAll.mockResolvedValue(enabledTasks);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.onModuleInit();

      expect(logger.log).toHaveBeenCalledWith('Initialized scheduler with 1 tasks');
    });
  });

  describe('createTask', () => {
    it('应该成功创建 CRON 任务', async () => {
      const createDto = {
        code: 'test-task',
        name: '测试任务',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'test-handler',
        allowManual: true,
        status: TaskStatus.DISABLED,
      };

      const createdTask = {
        id: 1,
        ...createDto,
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue(createdTask);

      const result = await service.createTask(createDto);

      expect(result).toEqual(createdTask);
      expect(taskRepository.create).toHaveBeenCalledWith({
        ...createDto,
        schedule: createDto.schedule,
      });
    });

    it('应该成功创建并注册启用的任务', async () => {
      const createDto = {
        code: 'enabled-task',
        name: '启用的任务',
        type: TaskType.INTERVAL,
        schedule: '60000',
        handler: 'test-handler',
        allowManual: true,
        status: TaskStatus.ENABLED,
      };

      const createdTask = {
        id: 1,
        ...createDto,
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue(createdTask);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.createTask(createDto);

      expect(schedulerRegistry.addInterval).toHaveBeenCalled();
    });

    it('当任务编码已存在时应该抛出异常', async () => {
      const createDto = {
        code: 'duplicate-task',
        name: '重复任务',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
      };

      taskRepository.findByCode.mockResolvedValue({
        id: 1,
        code: 'duplicate-task',
      } as TaskDefinitionEntity);

      await expect(service.createTask(createDto)).rejects.toThrow(BusinessException);
    });
  });

  describe('updateTask', () => {
    it('应该成功更新任务', async () => {
      const existingTask = {
        id: 1,
        code: 'test-task',
        name: '旧名称',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        status: TaskStatus.DISABLED,
      } as TaskDefinitionEntity;

      const updateDto = {
        name: '新名称',
        description: '更新的描述',
      };

      const updatedTask = {
        ...existingTask,
        ...updateDto,
      } as TaskDefinitionEntity;

      taskRepository.findByIdOrFail.mockResolvedValue(existingTask);
      taskRepository.update.mockResolvedValue(updatedTask);

      const result = await service.updateTask(1, updateDto);

      expect(result.name).toBe('新名称');
      expect(taskRepository.update).toHaveBeenCalled();
    });

    it('更新编码时应该检查重复', async () => {
      const existingTask = {
        id: 1,
        code: 'old-code',
      } as TaskDefinitionEntity;

      const updateDto = {
        code: 'new-code',
      };

      taskRepository.findByIdOrFail.mockResolvedValue(existingTask);
      taskRepository.findByCode.mockResolvedValue({
        id: 2,
        code: 'new-code',
      } as TaskDefinitionEntity);

      await expect(service.updateTask(1, updateDto)).rejects.toThrow(BusinessException);
    });

    it('启用任务时应该重新注册', async () => {
      const existingTask = {
        id: 1,
        code: 'test-task',
        status: TaskStatus.DISABLED,
      } as TaskDefinitionEntity;

      const updateDto = {
        status: TaskStatus.ENABLED,
      };

      const updatedTask = {
        ...existingTask,
        ...updateDto,
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'test-handler',
      } as TaskDefinitionEntity;

      taskRepository.findByIdOrFail.mockResolvedValue(existingTask);
      taskRepository.update.mockResolvedValue(updatedTask);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.updateTask(1, updateDto);

      expect(schedulerRegistry.addCronJob).toHaveBeenCalled();
    });
  });

  describe('toggleTask', () => {
    it('应该成功禁用任务', async () => {
      const task = {
        id: 1,
        code: 'test-task',
        type: TaskType.CRON,
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      const disabledTask = {
        ...task,
        status: TaskStatus.DISABLED,
      } as TaskDefinitionEntity;

      taskRepository.findByIdOrFail.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue(disabledTask);

      const result = await service.toggleTask(1, TaskStatus.DISABLED);

      expect(result.status).toBe(TaskStatus.DISABLED);
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(task.code);
    });

    it('应该成功启用任务', async () => {
      const task = {
        id: 1,
        code: 'test-task',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'test-handler',
        status: TaskStatus.DISABLED,
      } as TaskDefinitionEntity;

      const enabledTask = {
        ...task,
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      taskRepository.findByIdOrFail.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue(enabledTask);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.toggleTask(1, TaskStatus.ENABLED);

      expect(schedulerRegistry.addCronJob).toHaveBeenCalled();
    });
  });

  describe('findTasks', () => {
    it('应该成功查询任务列表', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      };

      taskRepository.paginate.mockResolvedValue(mockResult);

      const result = await service.findTasks(query);

      expect(result).toEqual(mockResult);
      expect(taskRepository.paginate).toHaveBeenCalled();
    });

    it('应该支持按类型过滤', async () => {
      const query = {
        type: TaskType.CRON,
        page: 1,
        limit: 10,
      };

      taskRepository.paginate.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findTasks(query);

      expect(taskRepository.paginate).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          where: [{ type: TaskType.CRON }],
        }),
      );
    });

    it('应该支持按状态过滤', async () => {
      const query = {
        status: TaskStatus.ENABLED,
        page: 1,
        limit: 10,
      };

      taskRepository.paginate.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findTasks(query);

      expect(taskRepository.paginate).toHaveBeenCalledWith(
        query,
        expect.objectContaining({
          where: [{ status: TaskStatus.ENABLED }],
        }),
      );
    });

    it('应该支持关键词搜索', async () => {
      const query = {
        keyword: 'test',
        page: 1,
        limit: 10,
      };

      taskRepository.paginate.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findTasks(query);

      // 应该搜索 code 和 name 字段
      expect(taskRepository.paginate).toHaveBeenCalled();
    });
  });

  describe('triggerTask', () => {
    it('应该成功手动触发任务', async () => {
      const task = {
        id: 1,
        code: 'test-task',
        name: '测试任务',
        allowManual: true,
        handler: 'test-handler',
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      const mockHandler = jest.fn().mockResolvedValue(undefined);

      taskRepository.findByIdOrFail.mockResolvedValue(task);
      taskRepository.findById.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue(undefined as any);
      handlerRegistry.get.mockReturnValue(mockHandler);
      taskLogRepository.create.mockResolvedValue({
        id: 1,
        taskId: task.id,
        status: TaskLogStatus.RUNNING,
      } as any);
      taskLogRepository.update.mockResolvedValue(undefined as any);
      cache.acquireLock.mockResolvedValue('lock-id');
      cache.releaseLock.mockResolvedValue(true);

      await service.triggerTask(1, {});

      expect(mockHandler).toHaveBeenCalled();
      expect(taskLogRepository.create).toHaveBeenCalled();
    });

    it('不允许手动触发时应该抛出异常', async () => {
      const task = {
        id: 1,
        code: 'test-task',
        allowManual: false,
      } as TaskDefinitionEntity;

      taskRepository.findByIdOrFail.mockResolvedValue(task);

      await expect(service.triggerTask(1, {})).rejects.toThrow(BusinessException);
    });

    it('任务执行失败时应该记录错误日志', async () => {
      const task = {
        id: 1,
        code: 'test-task',
        allowManual: true,
        handler: 'test-handler',
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      const mockHandler = jest.fn().mockRejectedValue(new Error('Task failed'));

      taskRepository.findByIdOrFail.mockResolvedValue(task);
      taskRepository.findById.mockResolvedValue(task);
      taskRepository.update.mockResolvedValue(undefined as any);
      handlerRegistry.get.mockReturnValue(mockHandler);
      taskLogRepository.create.mockResolvedValue({
        id: 1,
        taskId: task.id,
        status: TaskLogStatus.RUNNING,
      } as any);
      taskLogRepository.update.mockResolvedValue(undefined as any);
      cache.acquireLock.mockResolvedValue('lock-id');
      cache.releaseLock.mockResolvedValue(true);

      // 任务失败时会重新抛出错误
      await expect(service.triggerTask(1, {})).rejects.toThrow('Task failed');

      expect(taskLogRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: TaskLogStatus.FAILED,
        }),
      );
    });
  });

  describe('任务调度注册', () => {
    it('应该正确注册 CRON 任务', async () => {
      const task = {
        code: 'cron-task',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'test-handler',
        name: 'Test',
        allowManual: false,
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue({
        id: 1,
        ...task,
      } as TaskDefinitionEntity);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.createTask(task);

      expect(schedulerRegistry.addCronJob).toHaveBeenCalled();
    });

    it('应该正确注册 INTERVAL 任务', async () => {
      const task = {
        code: 'interval-task',
        type: TaskType.INTERVAL,
        schedule: '60000',
        handler: 'test-handler',
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue({
        id: 1,
        ...task,
        name: 'Test',
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.createTask({
        ...task,
        name: 'Test',
        allowManual: false,
        status: TaskStatus.ENABLED,
      });

      expect(schedulerRegistry.addInterval).toHaveBeenCalled();
    });

    it('应该正确注册 TIMEOUT 任务', async () => {
      const task = {
        code: 'timeout-task',
        type: TaskType.TIMEOUT,
        schedule: '5000',
        handler: 'test-handler',
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue({
        id: 1,
        ...task,
        name: 'Test',
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.createTask({
        ...task,
        name: 'Test',
        allowManual: false,
        status: TaskStatus.ENABLED,
      });

      expect(schedulerRegistry.addTimeout).toHaveBeenCalled();
    });

    it('处理器不存在时仍然可以创建任务', async () => {
      const task = {
        code: 'no-handler-task',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'non-existent-handler',
        name: 'Test',
        allowManual: false,
        status: TaskStatus.ENABLED,
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue({
        id: 1,
        ...task,
      } as TaskDefinitionEntity);
      handlerRegistry.get.mockReturnValue(false);

      const result = await service.createTask(task);

      expect(result).toBeDefined();
      expect(result.code).toBe('no-handler-task');
    });
  });

  describe('完整流程测试', () => {
    it('创建->启用->执行->禁用流程', async () => {
      // 1. 创建禁用的任务
      const createDto = {
        code: 'workflow-task',
        name: '流程测试任务',
        type: TaskType.CRON,
        schedule: '0 0 * * *',
        handler: 'test-handler',
        allowManual: true,
        status: TaskStatus.DISABLED,
      };

      const createdTask = {
        id: 1,
        ...createDto,
      } as TaskDefinitionEntity;

      taskRepository.findByCode.mockResolvedValue(null);
      taskRepository.create.mockResolvedValue(createdTask);

      const created = await service.createTask(createDto);
      expect(created.status).toBe(TaskStatus.DISABLED);

      // 2. 启用任务
      taskRepository.findByIdOrFail.mockResolvedValue(createdTask);
      const enabledTask = { ...createdTask, status: TaskStatus.ENABLED };
      taskRepository.update.mockResolvedValue(enabledTask);
      handlerRegistry.get.mockReturnValue(jest.fn());

      await service.toggleTask(1, TaskStatus.ENABLED);
      expect(schedulerRegistry.addCronJob).toHaveBeenCalled();

      // 3. 手动执行
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      taskRepository.findByIdOrFail.mockResolvedValue(enabledTask);
      taskRepository.findById.mockResolvedValue(enabledTask);
      handlerRegistry.get.mockReturnValue(mockHandler);
      taskLogRepository.create.mockResolvedValue({
        id: 1,
        taskId: 1,
        status: TaskLogStatus.SUCCESS,
      } as any);

      await service.triggerTask(1, {});
      expect(mockHandler).toHaveBeenCalled();

      // 4. 禁用任务
      await service.toggleTask(1, TaskStatus.DISABLED);
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalled();
    });
  });
});
