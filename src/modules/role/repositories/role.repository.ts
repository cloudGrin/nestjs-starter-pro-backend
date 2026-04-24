import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  create(data: DeepPartial<RoleEntity>): RoleEntity {
    return this.repository.create(data);
  }

  async save(entity: DeepPartial<RoleEntity>): Promise<RoleEntity> {
    return this.repository.save(entity);
  }

  async findOne(options: FindOneOptions<RoleEntity>): Promise<RoleEntity | null> {
    return this.repository.findOne(options);
  }

  async find(options?: FindManyOptions<RoleEntity>): Promise<RoleEntity[]> {
    return this.repository.find(options);
  }

  async softDelete(id: number): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (result.affected === 0) {
      throw BusinessException.notFound('Role', id);
    }
  }

  /**
   * 根据角色编码查找
   */
  async findByCode(code: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['permissions'],
    });
  }

  /**
   * 查找所有活跃的角色
   */
  async findActiveRoles(): Promise<RoleEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { sort: 'ASC', createdAt: 'DESC' },
      relations: ['permissions'],
    });
  }

  /**
   * 检查角色编码是否存在
   */
  async isCodeExist(code: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository.createQueryBuilder('role').where('role.code = :code', { code });

    if (excludeId) {
      qb.andWhere('role.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 查询角色列表
   */
  async findWithQuery(query: {
    name?: string;
    code?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<[RoleEntity[], number]> {
    const { name, code, isActive, page = 1, limit = 10 } = query;

    const qb = this.repository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission');

    if (name) {
      qb.andWhere('role.name LIKE :name', { name: `%${name}%` });
    }

    if (code) {
      qb.andWhere('role.code LIKE :code', { code: `%${code}%` });
    }

    if (isActive !== undefined) {
      qb.andWhere('role.isActive = :isActive', { isActive });
    }

    qb.orderBy('role.sort', 'ASC')
      .addOrderBy('role.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }
}
