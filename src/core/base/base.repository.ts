import {
  Repository,
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  SelectQueryBuilder,
  In,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BusinessException } from '~/common/exceptions/business.exception';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

/**
 * 基础仓储类
 * 封装常用的数据库操作
 */
export abstract class BaseRepository<T extends { id: number }> {
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * 根据 ID 查找单个实体
   */
  async findById(id: number, options?: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: { id } as FindOptionsWhere<T>,
    });
  }

  /**
   * 根据 ID 查找单个实体，不存在则抛出异常
   */
  async findByIdOrFail(id: number, options?: FindOneOptions<T>): Promise<T> {
    const entity = await this.findById(id, options);
    if (!entity) {
      throw BusinessException.notFound(this.getEntityName(), id);
    }
    return entity;
  }

  /**
   * 根据多个 ID 查找实体
   */
  async findByIds(ids: number[], options?: FindManyOptions<T>): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.find({
      ...options,
      where: { id: In(ids) } as FindOptionsWhere<T>,
    });
  }

  /**
   * 查找所有实体
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * 根据条件查找单个实体
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  /**
   * 根据条件查找多个实体
   */
  async findMany(options: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * 根据条件查找多个实体（别名）
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  /**
   * 创建实体对象（不保存到数据库）
   */
  create(data: DeepPartial<T>): T {
    return this.repository.create(data);
  }

  /**
   * 创建并保存实体
   */
  async createAndSave(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * 批量创建实体
   */
  async createMany(data: DeepPartial<T>[]): Promise<T[]> {
    const entities = this.repository.create(data);
    return this.repository.save(entities);
  }

  /**
   * 更新实体
   */
  async update(id: number, data: QueryDeepPartialEntity<T>): Promise<T> {
    await this.repository.update(id, data);
    return this.findByIdOrFail(id);
  }

  /**
   * 批量更新
   */
  async updateMany(where: FindOptionsWhere<T>, data: QueryDeepPartialEntity<T>): Promise<number> {
    const result = await this.repository.update(where, data);
    return result.affected || 0;
  }

  /**
   * 保存实体（创建或更新）
   */
  async save(entity: DeepPartial<T>): Promise<T> {
    return this.repository.save(entity);
  }

  /**
   * 删除实体
   */
  async delete(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw BusinessException.notFound(this.getEntityName(), id);
    }
  }

  /**
   * 批量删除
   */
  async deleteMany(ids: number[]): Promise<number> {
    const result = await this.repository.delete(ids);
    return result.affected || 0;
  }

  /**
   * 软删除实体
   */
  async softDelete(id: number): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (result.affected === 0) {
      throw BusinessException.notFound(this.getEntityName(), id);
    }
  }

  /**
   * 恢复软删除的实体
   */
  async restore(id: number): Promise<void> {
    const result = await this.repository.restore(id);
    if (result.affected === 0) {
      throw BusinessException.notFound(this.getEntityName(), id);
    }
  }

  /**
   * 计数
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  /**
   * 检查是否存在
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  /**
   * 分页查询
   */
  async paginate(
    options: PaginationOptions,
    findOptions?: FindManyOptions<T>,
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.repository.findAndCount({
      ...findOptions,
      skip,
      take: limit,
      order: options.sort
        ? ({ [options.sort]: options.order || 'ASC' } as any)
        : findOptions?.order,
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

  /**
   * 创建查询构建器
   */
  createQueryBuilder(alias?: string): SelectQueryBuilder<T> {
    return this.repository.createQueryBuilder(alias);
  }

  /**
   * 获取实体名称（用于错误消息）
   */
  protected getEntityName(): string {
    return this.repository.metadata.name;
  }

  /**
   * 事务处理
   */
  async transaction<R>(runInTransaction: (repository: Repository<T>) => Promise<R>): Promise<R> {
    return this.repository.manager.transaction(async (manager) => {
      const transactionalRepository = manager.getRepository(this.repository.target);
      return runInTransaction(transactionalRepository);
    });
  }
}
