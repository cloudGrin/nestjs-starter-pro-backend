import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { DictTypeEntity } from '../entities/dict-type.entity';

@Injectable()
export class DictTypeRepository extends BaseRepository<DictTypeEntity> {
  constructor(
    @InjectRepository(DictTypeEntity)
    repository: Repository<DictTypeEntity>,
  ) {
    super(repository);
  }

  /**
   * 根据字典编码查找
   */
  async findByCode(code: string): Promise<DictTypeEntity | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['items'],
    });
  }

  /**
   * 查找所有启用的字典类型
   */
  async findEnabled(): Promise<DictTypeEntity[]> {
    return this.repository.find({
      where: { isEnabled: true },
      order: { sort: 'ASC', createdAt: 'DESC' },
      relations: ['items'],
    });
  }

  /**
   * 检查字典编码是否存在
   */
  async isCodeExist(code: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('dictType')
      .where('dictType.code = :code', { code });

    if (excludeId) {
      qb.andWhere('dictType.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 查询字典类型列表
   */
  async findWithQuery(query: {
    code?: string;
    name?: string;
    source?: string;
    isEnabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<[DictTypeEntity[], number]> {
    const { code, name, source, isEnabled, page = 1, limit = 10 } = query;

    const qb = this.repository
      .createQueryBuilder('dictType')
      .leftJoinAndSelect('dictType.items', 'item');

    if (code) {
      qb.andWhere('dictType.code LIKE :code', { code: `%${code}%` });
    }

    if (name) {
      qb.andWhere('dictType.name LIKE :name', { name: `%${name}%` });
    }

    if (source) {
      qb.andWhere('dictType.source = :source', { source });
    }

    if (isEnabled !== undefined) {
      qb.andWhere('dictType.isEnabled = :isEnabled', { isEnabled });
    }

    qb.orderBy('dictType.sort', 'ASC')
      .addOrderBy('dictType.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }
}
