import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { SystemConfigEntity, ConfigGroup, ConfigType } from '../entities/system-config.entity';

@Injectable()
export class SystemConfigRepository extends BaseRepository<SystemConfigEntity> {
  constructor(
    @InjectRepository(SystemConfigEntity)
    repository: Repository<SystemConfigEntity>,
  ) {
    super(repository);
  }

  /**
   * 根据配置键名查找
   */
  async findByKey(configKey: string): Promise<SystemConfigEntity | null> {
    return this.repository.findOne({
      where: { configKey },
    });
  }

  /**
   * 根据分组查找配置
   */
  async findByGroup(group: ConfigGroup): Promise<SystemConfigEntity[]> {
    return this.repository.find({
      where: { configGroup: group, isEnabled: true },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取所有启用的配置
   */
  async findEnabled(): Promise<SystemConfigEntity[]> {
    return this.repository.find({
      where: { isEnabled: true },
      order: { sort: 'ASC', configGroup: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * 检查配置键名是否存在
   */
  async isKeyExist(configKey: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('config')
      .where('config.configKey = :configKey', { configKey });

    if (excludeId) {
      qb.andWhere('config.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 查询配置列表
   */
  async findWithQuery(query: {
    configKey?: string;
    configName?: string;
    configType?: ConfigType;
    configGroup?: ConfigGroup;
    isEnabled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<[SystemConfigEntity[], number]> {
    const {
      configKey,
      configName,
      configType,
      configGroup,
      isEnabled,
      page = 1,
      limit = 10,
    } = query;

    const qb = this.repository.createQueryBuilder('config');

    if (configKey) {
      qb.andWhere('config.configKey LIKE :configKey', {
        configKey: `%${configKey}%`,
      });
    }

    if (configName) {
      qb.andWhere('config.configName LIKE :configName', {
        configName: `%${configName}%`,
      });
    }

    if (configType) {
      qb.andWhere('config.configType = :configType', { configType });
    }

    if (configGroup) {
      qb.andWhere('config.configGroup = :configGroup', { configGroup });
    }

    if (isEnabled !== undefined) {
      qb.andWhere('config.isEnabled = :isEnabled', { isEnabled });
    }

    qb.orderBy('config.configGroup', 'ASC')
      .addOrderBy('config.sort', 'ASC')
      .addOrderBy('config.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * 批量获取配置值（返回键值对）
   */
  async getConfigMap(keys?: string[]): Promise<Record<string, any>> {
    const qb = this.repository
      .createQueryBuilder('config')
      .where('config.isEnabled = :isEnabled', { isEnabled: true });

    if (keys && keys.length > 0) {
      qb.andWhere('config.configKey IN (:...keys)', { keys });
    }

    const configs = await qb.getMany();

    const configMap: Record<string, any> = {};
    for (const config of configs) {
      configMap[config.configKey] = config.getParsedValue();
    }

    return configMap;
  }
}
