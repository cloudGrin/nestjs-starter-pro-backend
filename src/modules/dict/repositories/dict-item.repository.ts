import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { DictItemEntity, DictItemStatus } from '../entities/dict-item.entity';

@Injectable()
export class DictItemRepository extends BaseRepository<DictItemEntity> {
  constructor(
    @InjectRepository(DictItemEntity)
    repository: Repository<DictItemEntity>,
  ) {
    super(repository);
  }

  /**
   * 根据字典类型ID和值查找
   */
  async findByTypeIdAndValue(dictTypeId: number, value: string): Promise<DictItemEntity | null> {
    return this.repository.findOne({
      where: { dictTypeId, value },
    });
  }

  /**
   * 根据字典类型编码和值查找
   */
  async findByTypeCodeAndValue(typeCode: string, value: string): Promise<DictItemEntity | null> {
    return this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.dictType', 'dictType')
      .where('dictType.code = :typeCode', { typeCode })
      .andWhere('item.value = :value', { value })
      .getOne();
  }

  /**
   * 查找字典类型下的所有启用项
   */
  async findEnabledByTypeId(dictTypeId: number): Promise<DictItemEntity[]> {
    return this.repository.find({
      where: { dictTypeId, status: DictItemStatus.ENABLED },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * 查找字典类型下的所有启用项（通过编码）
   */
  async findEnabledByTypeCode(typeCode: string): Promise<DictItemEntity[]> {
    return this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.dictType', 'dictType')
      .where('dictType.code = :typeCode', { typeCode })
      .andWhere('dictType.isEnabled = :isEnabled', { isEnabled: true })
      .andWhere('item.status = :status', { status: 'enabled' })
      .orderBy('item.sort', 'ASC')
      .addOrderBy('item.createdAt', 'DESC')
      .getMany();
  }

  /**
   * 获取默认值
   */
  async findDefaultByTypeId(dictTypeId: number): Promise<DictItemEntity | null> {
    return this.repository.findOne({
      where: { dictTypeId, isDefault: true, status: DictItemStatus.ENABLED },
    });
  }

  /**
   * 检查字典项值是否存在
   */
  async isValueExist(dictTypeId: number, value: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('item')
      .where('item.dictTypeId = :dictTypeId', { dictTypeId })
      .andWhere('item.value = :value', { value });

    if (excludeId) {
      qb.andWhere('item.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 查询字典项列表
   */
  async findWithQuery(query: {
    dictTypeId?: number;
    dictTypeCode?: string;
    label?: string;
    value?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<[DictItemEntity[], number]> {
    const { dictTypeId, dictTypeCode, label, value, status, page = 1, limit = 10 } = query;

    const qb = this.repository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.dictType', 'dictType');

    if (dictTypeId) {
      qb.andWhere('item.dictTypeId = :dictTypeId', { dictTypeId });
    }

    if (dictTypeCode) {
      qb.andWhere('dictType.code = :dictTypeCode', { dictTypeCode });
    }

    if (label) {
      qb.andWhere('(item.label LIKE :label OR item.labelEn LIKE :label)', {
        label: `%${label}%`,
      });
    }

    if (value) {
      qb.andWhere('item.value LIKE :value', { value: `%${value}%` });
    }

    if (status) {
      qb.andWhere('item.status = :status', { status });
    }

    qb.orderBy('item.sort', 'ASC')
      .addOrderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * 批量创建字典项
   */
  async createBatch(items: DictItemEntity[]): Promise<DictItemEntity[]> {
    return this.repository.save(items);
  }

  /**
   * 删除字典类型下的所有项
   */
  async deleteByTypeId(dictTypeId: number): Promise<void> {
    await this.repository.softDelete({ dictTypeId });
  }
}
