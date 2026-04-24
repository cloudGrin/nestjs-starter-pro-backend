import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindManyOptions } from 'typeorm';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';
import { ApiAppEntity } from '../entities/api-app.entity';

@Injectable()
export class ApiAppRepository {
  constructor(
    @InjectRepository(ApiAppEntity)
    private readonly repository: Repository<ApiAppEntity>,
  ) {}

  create(data: DeepPartial<ApiAppEntity>): ApiAppEntity {
    return this.repository.create(data);
  }

  async save(entity: DeepPartial<ApiAppEntity>): Promise<ApiAppEntity> {
    return this.repository.save(entity);
  }

  async findById(id: number): Promise<ApiAppEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async update(id: number, data: Partial<ApiAppEntity>): Promise<ApiAppEntity> {
    await this.repository.update(id, data);
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(`ApiApp ${id} not found after update`);
    }
    return entity;
  }

  async paginate(
    options: PaginationOptions,
    findOptions?: FindManyOptions<ApiAppEntity>,
  ): Promise<PaginationResult<ApiAppEntity>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.repository.findAndCount({
      ...findOptions,
      skip,
      take: limit,
      order: options.sort
        ? ({ [options.sort]: options.order || 'ASC' } as FindManyOptions<ApiAppEntity>['order'])
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
   * 根据名称查找应用
   */
  async findByName(name: string): Promise<ApiAppEntity | null> {
    return this.repository.findOne({
      where: { name },
      relations: ['apiKeys'],
    });
  }

  /**
   * 查找所有活跃的应用
   */
  async findActiveApps(): Promise<ApiAppEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 查询应用列表（分页）
   */
  async findWithQuery(query: {
    name?: string;
    isActive?: boolean;
    ownerId?: number;
    page?: number;
    limit?: number;
  }): Promise<[ApiAppEntity[], number]> {
    const { name, isActive, ownerId, page = 1, limit = 10 } = query;

    const qb = this.repository.createQueryBuilder('app').leftJoinAndSelect('app.apiKeys', 'keys');

    if (name) {
      qb.andWhere('app.name LIKE :name', { name: `%${name}%` });
    }

    if (isActive !== undefined) {
      qb.andWhere('app.isActive = :isActive', { isActive });
    }

    if (ownerId !== undefined) {
      qb.andWhere('app.ownerId = :ownerId', { ownerId });
    }

    qb.orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * 检查应用名称是否存在
   */
  async isNameExist(name: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository.createQueryBuilder('app').where('app.name = :name', { name });

    if (excludeId) {
      qb.andWhere('app.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
