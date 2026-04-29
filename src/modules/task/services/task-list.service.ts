import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { LoggerService } from '~/shared/logger/logger.service';
import { CreateTaskListDto, UpdateTaskListDto } from '../dto';
import { TaskEntity } from '../entities/task.entity';
import { TaskListEntity, TaskListScope } from '../entities/task-list.entity';

interface CurrentUserLike {
  id: number;
  isSuperAdmin?: boolean;
  roleCode?: string;
  roles?: string[];
}

@Injectable()
export class TaskListService {
  constructor(
    @InjectRepository(TaskListEntity)
    private readonly taskListRepository: Repository<TaskListEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly logger: LoggerService,
  ) {}

  async createList(dto: CreateTaskListDto, user: CurrentUserLike): Promise<TaskListEntity> {
    const entity = this.taskListRepository.create({
      ...dto,
      ownerId: user.id,
      scope: dto.scope ?? TaskListScope.PERSONAL,
      isArchived: dto.isArchived ?? false,
      sort: dto.sort ?? 0,
    });

    const saved = await this.taskListRepository.save(entity);
    this.logger.log(`Created task list "${saved.name}" by user ${user.id}`);
    return saved;
  }

  async findLists(user: CurrentUserLike): Promise<TaskListEntity[]> {
    const isSuperAdmin =
      user.isSuperAdmin || user.roleCode === 'super_admin' || user.roles?.includes('super_admin');

    return this.taskListRepository.find({
      where: isSuperAdmin
        ? undefined
        : [{ scope: TaskListScope.FAMILY }, { scope: TaskListScope.PERSONAL, ownerId: user.id }],
      order: {
        sort: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async updateList(
    id: number,
    dto: UpdateTaskListDto,
    user: CurrentUserLike,
  ): Promise<TaskListEntity> {
    const entity = await this.findById(id);
    this.ensureCanManageList(entity, user);
    Object.assign(entity, dto);
    return this.taskListRepository.save(entity);
  }

  async removeList(id: number, user: CurrentUserLike): Promise<void> {
    const entity = await this.findById(id);
    this.ensureCanManageList(entity, user);

    const taskCount = await this.taskRepository.count({ where: { listId: id } });
    if (taskCount > 0) {
      throw BusinessException.validationFailed('清单下仍有任务，不能删除');
    }

    const result = await this.taskListRepository.softDelete(id);
    if (!result.affected) {
      throw BusinessException.notFound('Task list', id);
    }
  }

  private async findById(id: number): Promise<TaskListEntity> {
    const entity = await this.taskListRepository.findOne({ where: { id } });
    if (!entity) {
      throw BusinessException.notFound('Task list', id);
    }

    return entity;
  }

  private ensureCanManageList(list: TaskListEntity, user: CurrentUserLike): void {
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

  private isSuperAdmin(user: CurrentUserLike): boolean {
    return (
      user.isSuperAdmin === true ||
      user.roleCode === 'super_admin' ||
      user.roles?.includes('super_admin') === true
    );
  }
}
