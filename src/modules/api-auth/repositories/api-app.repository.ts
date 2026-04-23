import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { ApiAppEntity } from '../entities/api-app.entity';

@Injectable()
export class ApiAppRepository extends BaseRepository<ApiAppEntity> {
  constructor(
    @InjectRepository(ApiAppEntity)
    repository: Repository<ApiAppEntity>,
  ) {
    super(repository);
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
