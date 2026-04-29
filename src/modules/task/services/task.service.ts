import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { DataSource, Repository } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { PaginationResult } from '~/common/types/pagination.types';
import { LoggerService } from '~/shared/logger/logger.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { UserStatus } from '~/common/enums/user.enum';
import { CreateTaskDto, QueryTaskDto, TaskQueryView, UpdateTaskDto } from '../dto';
import { TaskListEntity, TaskListScope } from '../entities/task-list.entity';
import { TaskEntity, TaskRecurrenceType, TaskStatus, TaskType } from '../entities/task.entity';
import { TaskCompletionEntity } from '../entities/task-completion.entity';

interface CurrentUserLike {
  id: number;
  isSuperAdmin?: boolean;
  roleCode?: string;
  roles?: string[];
}

interface TaskDatePatch {
  dueAt?: Date | null;
  remindAt?: Date | null;
}

interface FindTaskOptions {
  lock?: boolean;
}

const TASK_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'dueAt',
  'remindAt',
  'completedAt',
  'title',
]);

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskListEntity)
    private readonly taskListRepository: Repository<TaskListEntity>,
    @InjectRepository(TaskCompletionEntity)
    private readonly taskCompletionRepository: Repository<TaskCompletionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  async createTask(dto: CreateTaskDto, user: CurrentUserLike): Promise<TaskEntity> {
    const list = await this.ensureListExists(dto.listId);
    this.ensureCanUseList(list, user);
    await this.ensureAssigneeExists(dto.assigneeId);

    const entity = this.taskRepository.create({
      ...this.toTaskPatch(dto),
      title: dto.title,
      listId: dto.listId,
      creatorId: user.id,
      assigneeId: dto.assigneeId,
      status: TaskStatus.PENDING,
      taskType: dto.taskType ?? TaskType.TASK,
      recurrenceType: dto.recurrenceType ?? TaskRecurrenceType.NONE,
      recurrenceInterval: dto.recurrenceInterval ?? null,
      important: dto.important ?? false,
      urgent: dto.urgent ?? false,
      tags: dto.tags ?? null,
      reminderChannels: dto.reminderChannels ?? null,
      sendExternalReminder: dto.sendExternalReminder ?? false,
    });

    const saved = await this.taskRepository.save(entity);
    this.logger.log(`Created task "${saved.title}" by user ${user.id}`);
    return saved;
  }

  async findTasks(
    query: QueryTaskDto,
    user: CurrentUserLike,
  ): Promise<PaginationResult<TaskEntity>> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.list', 'list')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee');

    this.applyVisibility(qb, user);
    this.applyFilters(qb, query);
    this.applyView(qb, query);
    this.applySorting(qb, query);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    qb.skip((page - 1) * limit).take(limit);

    const [items, totalItems] = await qb.getManyAndCount();

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

  async findTask(id: number, user: CurrentUserLike): Promise<TaskEntity> {
    return this.findByIdOrFail(id, user);
  }

  async findAssigneeOptions(): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { status: UserStatus.ACTIVE },
      select: ['id', 'username', 'nickname', 'realName'],
      order: { id: 'ASC' },
    });
  }

  async updateTask(id: number, dto: UpdateTaskDto, user: CurrentUserLike): Promise<TaskEntity> {
    const entity = await this.findByIdOrFail(id, user);

    if (dto.listId !== undefined) {
      const list = await this.ensureListExists(dto.listId);
      this.ensureCanUseList(list, user);
    }

    if (dto.assigneeId !== undefined) {
      await this.ensureAssigneeExists(dto.assigneeId);
    }

    Object.assign(entity, this.toTaskPatch(dto));
    return this.taskRepository.save(entity);
  }

  async completeTask(
    id: number,
    completedById: number,
    user?: CurrentUserLike,
  ): Promise<TaskEntity> {
    return this.dataSource.transaction(async (manager) => {
      const taskRepository = manager.getRepository(TaskEntity);
      const completionRepository = manager.getRepository(TaskCompletionEntity);
      const task = await this.findByIdOrFail(id, user, taskRepository, { lock: true });

      if (task.status === TaskStatus.COMPLETED) {
        throw BusinessException.validationFailed('任务已完成');
      }

      const completedAt = new Date();
      const nextOccurrence = this.isRecurring(task)
        ? this.calculateNextOccurrencePatch(task, completedAt)
        : null;
      const nextDueAt = nextOccurrence?.dueAt ?? nextOccurrence?.remindAt ?? null;

      await completionRepository.save(
        completionRepository.create({
          taskId: task.id,
          completedById,
          completedAt,
          occurrenceDueAt: task.dueAt ?? task.remindAt ?? null,
          nextDueAt,
        }),
      );

      if (this.isRecurring(task) && nextOccurrence) {
        this.rollRecurringTask(task, nextOccurrence);
      } else {
        task.status = TaskStatus.COMPLETED;
        task.completedAt = completedAt;
      }

      return taskRepository.save(task);
    });
  }

  async reopenTask(id: number, user: CurrentUserLike): Promise<TaskEntity> {
    const task = await this.findByIdOrFail(id, user);
    task.status = TaskStatus.PENDING;
    task.completedAt = null;
    task.remindedAt = null;
    return this.taskRepository.save(task);
  }

  async removeTask(id: number, user: CurrentUserLike): Promise<void> {
    await this.findByIdOrFail(id, user);
    const result = await this.taskRepository.softDelete(id);
    if (!result.affected) {
      throw BusinessException.notFound('Task', id);
    }
  }

  private async ensureListExists(listId: number): Promise<TaskListEntity> {
    const list = await this.taskListRepository.findOne({ where: { id: listId } });
    if (!list) {
      throw BusinessException.notFound('Task list', listId);
    }

    return list;
  }

  private async ensureAssigneeExists(assigneeId?: number | null): Promise<void> {
    if (!assigneeId) {
      return;
    }

    const assignee = await this.userRepository.findOne({ where: { id: assigneeId } });
    if (!assignee) {
      throw BusinessException.notFound('User', assigneeId);
    }
  }

  private async findByIdOrFail(
    id: number,
    user?: CurrentUserLike,
    repository: Repository<TaskEntity> = this.taskRepository,
    options: FindTaskOptions = {},
  ): Promise<TaskEntity> {
    const entity = options.lock
      ? await repository
          .createQueryBuilder('task')
          .leftJoinAndSelect('task.list', 'list')
          .leftJoinAndSelect('task.creator', 'creator')
          .leftJoinAndSelect('task.assignee', 'assignee')
          .where('task.id = :id', { id })
          .setLock('pessimistic_write')
          .getOne()
      : await repository.findOne({
          where: { id },
          relations: ['list', 'creator', 'assignee'],
        });

    if (!entity) {
      throw BusinessException.notFound('Task', id);
    }

    if (user && !this.canAccessTask(entity, user)) {
      throw BusinessException.notFound('Task', id);
    }

    return entity;
  }

  private toTaskPatch(dto: Partial<CreateTaskDto | UpdateTaskDto>): Partial<TaskEntity> {
    const dates = this.toDatePatch(dto);
    const patch: Partial<TaskEntity> = {
      ...dates,
    };

    for (const key of [
      'title',
      'description',
      'listId',
      'assigneeId',
      'taskType',
      'important',
      'urgent',
      'tags',
      'recurrenceType',
      'recurrenceInterval',
      'reminderChannels',
      'sendExternalReminder',
    ] as const) {
      if (dto[key] !== undefined) {
        (patch as any)[key] = dto[key];
      }
    }

    return patch;
  }

  private toDatePatch(dto: Partial<CreateTaskDto | UpdateTaskDto>): TaskDatePatch {
    const patch: TaskDatePatch = {};

    if (dto.dueAt !== undefined) {
      patch.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    }

    if (dto.remindAt !== undefined) {
      patch.remindAt = dto.remindAt ? new Date(dto.remindAt) : null;
    }

    return patch;
  }

  private isRecurring(task: TaskEntity): boolean {
    return task.recurrenceType !== TaskRecurrenceType.NONE;
  }

  private calculateNextOccurrence(baseDate: Date, task: TaskEntity): Date {
    const interval = Math.max(task.recurrenceInterval ?? 1, 1);
    const base = dayjs(baseDate);

    switch (task.recurrenceType) {
      case TaskRecurrenceType.DAILY:
        return base.add(interval, 'day').toDate();
      case TaskRecurrenceType.WEEKLY:
        return base.add(interval, 'week').toDate();
      case TaskRecurrenceType.MONTHLY:
        return base.add(interval, 'month').toDate();
      case TaskRecurrenceType.YEARLY:
        return base.add(interval, 'year').toDate();
      case TaskRecurrenceType.WEEKDAYS:
        return this.nextWeekday(baseDate);
      case TaskRecurrenceType.CUSTOM:
        return base.add(interval, 'day').toDate();
      case TaskRecurrenceType.NONE:
      default:
        return baseDate;
    }
  }

  private nextWeekday(baseDate: Date): Date {
    let next = dayjs(baseDate).add(1, 'day');

    while ([0, 6].includes(next.day())) {
      next = next.add(1, 'day');
    }

    return next.toDate();
  }

  private calculateNextOccurrencePatch(
    task: TaskEntity,
    completedAt: Date,
  ): { dueAt: Date | null; remindAt: Date | null } | null {
    const nextDueAt = task.dueAt ? this.calculateNextOccurrence(task.dueAt, task) : null;
    const nextRemindAt = task.remindAt ? this.calculateNextOccurrence(task.remindAt, task) : null;

    if (!nextDueAt && !nextRemindAt) {
      return {
        dueAt: this.calculateNextOccurrence(completedAt, task),
        remindAt: null,
      };
    }

    return {
      dueAt: nextDueAt,
      remindAt: nextRemindAt,
    };
  }

  private rollRecurringTask(
    task: TaskEntity,
    nextOccurrence: { dueAt: Date | null; remindAt: Date | null },
  ): void {
    task.status = TaskStatus.PENDING;
    task.completedAt = null;
    task.dueAt = nextOccurrence.dueAt;
    task.remindAt = nextOccurrence.remindAt;
    task.remindedAt = null;
  }

  private ensureCanUseList(list: TaskListEntity, user: CurrentUserLike): void {
    if (this.isSuperAdmin(user)) {
      return;
    }

    if (list.scope === TaskListScope.FAMILY) {
      return;
    }

    if (list.ownerId === user.id) {
      return;
    }

    throw BusinessException.notFound('Task list', list.id);
  }

  private canAccessTask(task: TaskEntity, user: CurrentUserLike): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (task.list?.scope === TaskListScope.FAMILY) {
      return true;
    }

    if (task.list?.scope === TaskListScope.PERSONAL && task.list.ownerId === user.id) {
      return true;
    }

    return task.creatorId === user.id || task.assigneeId === user.id;
  }

  private isSuperAdmin(user: CurrentUserLike): boolean {
    return (
      user.isSuperAdmin === true ||
      user.roleCode === 'super_admin' ||
      user.roles?.includes('super_admin') === true
    );
  }

  private applyVisibility(qb: any, user: CurrentUserLike): void {
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.roleCode === 'super_admin' ||
      user.roles?.includes('super_admin') === true;

    if (isSuperAdmin) {
      return;
    }

    qb.where(
      '(task.creatorId = :currentUserId OR task.assigneeId = :currentUserId OR list.scope = :familyScope OR list.ownerId = :currentUserId)',
      {
        currentUserId: user.id,
        familyScope: TaskListScope.FAMILY,
      },
    );
  }

  private applyFilters(qb: any, query: QueryTaskDto): void {
    if (query.taskId) {
      qb.andWhere('task.id = :taskId', { taskId: query.taskId });
    }

    if (query.listId) {
      qb.andWhere('task.listId = :listId', { listId: query.listId });
    }

    if (query.assigneeId) {
      qb.andWhere('task.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
    }

    if (query.status) {
      qb.andWhere('task.status = :status', { status: query.status });
    }

    if (query.keyword) {
      qb.andWhere('(task.title LIKE :keyword OR task.description LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    query.tags?.forEach((tag, index) => {
      qb.andWhere(`JSON_CONTAINS(task.tags, :tag${index})`, {
        [`tag${index}`]: JSON.stringify(tag),
      });
    });
  }

  private applyView(qb: any, query: QueryTaskDto): void {
    const view = query.view ?? TaskQueryView.LIST;

    if (view === TaskQueryView.ANNIVERSARY) {
      qb.andWhere('task.taskType = :taskType', { taskType: TaskType.ANNIVERSARY });
      return;
    }

    if (view === TaskQueryView.MATRIX) {
      qb.andWhere('task.status = :matrixStatus', { matrixStatus: TaskStatus.PENDING });
      return;
    }

    if (view === TaskQueryView.TODAY) {
      const { start, end } = this.resolveDateRange(query, true);
      qb.andWhere(
        '((task.dueAt BETWEEN :todayStart AND :todayEnd) OR (task.remindAt BETWEEN :todayStart AND :todayEnd))',
        {
          todayStart: start,
          todayEnd: end,
        },
      );
      return;
    }

    if (view === TaskQueryView.CALENDAR || query.startDate || query.endDate) {
      const { start, end } = this.resolveDateRange(query, false);
      if (start && end) {
        qb.andWhere(
          '((task.dueAt BETWEEN :rangeStart AND :rangeEnd) OR (task.remindAt BETWEEN :rangeStart AND :rangeEnd))',
          { rangeStart: start, rangeEnd: end },
        );
      } else if (start) {
        qb.andWhere('(task.dueAt >= :rangeStart OR task.remindAt >= :rangeStart)', {
          rangeStart: start,
        });
      } else if (end) {
        qb.andWhere('(task.dueAt <= :rangeEnd OR task.remindAt <= :rangeEnd)', { rangeEnd: end });
      }
    }
  }

  private applySorting(qb: any, query: QueryTaskDto): void {
    if (query.view === TaskQueryView.MATRIX) {
      qb.orderBy('task.important', 'DESC').addOrderBy('task.urgent', 'DESC');
      return;
    }

    const sort = query.sort && TASK_SORT_FIELDS.has(query.sort) ? query.sort : 'dueAt';
    const order = query.order ?? 'ASC';

    qb.orderBy(`task.${sort}`, order).addOrderBy('task.createdAt', 'DESC');
  }

  private resolveDateRange(
    query: QueryTaskDto,
    defaultToday: boolean,
  ): { start?: Date; end?: Date } {
    if (defaultToday) {
      return {
        start: dayjs().startOf('day').toDate(),
        end: dayjs().endOf('day').toDate(),
      };
    }

    return {
      start: query.startDate ? dayjs(query.startDate).startOf('day').toDate() : undefined,
      end: query.endDate ? dayjs(query.endDate).endOf('day').toDate() : undefined,
    };
  }
}
