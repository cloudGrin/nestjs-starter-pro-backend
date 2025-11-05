import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { PaginationResult } from '~/core/base/base.repository';
import { SystemConfigEntity, ConfigType } from '../entities/system-config.entity';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import {
  CreateSystemConfigDto,
  QuerySystemConfigDto,
  UpdateConfigValueDto,
  BatchUpdateConfigDto,
} from '../dto/system-config.dto';

@Injectable()
export class SystemConfigService extends BaseService<SystemConfigEntity> {
  protected repository: SystemConfigRepository;
  private readonly CACHE_KEY_PREFIX = 'system:config:';
  private readonly CACHE_ALL_KEY = 'system:config:all';

  constructor(
    private readonly configRepository: SystemConfigRepository,
    logger: LoggerService,
    cache: CacheService,
    eventEmitter: EventEmitter2,
  ) {
    super();
    this.repository = configRepository;
    this.logger = logger;
    this.cache = cache;
    this.eventEmitter = eventEmitter;
    this.logger.setContext(SystemConfigService.name);
  }

  /**
   * 创建配置项
   */
  async create(dto: CreateSystemConfigDto): Promise<SystemConfigEntity> {
    // 检查配置键名是否存在
    if (await this.configRepository.isKeyExist(dto.configKey)) {
      throw new ConflictException('配置键名已存在');
    }

    // 验证配置值格式
    this.validateConfigValue(dto.configValue, dto.configType);

    // 创建配置
    const config = this.configRepository.create({
      ...dto,
      isSystem: false,
      isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
      sort: dto.sort !== undefined ? dto.sort : 0,
    });

    const saved = await this.configRepository.save(config);

    // 发送事件
    this.eventEmitter.emit('system-config.created', { config: saved });

    // 清除缓存
    await this.clearConfigCache();

    this.logger.log(`Created config: ${saved.configName} (${saved.configKey})`);

    return saved;
  }

  /**
   * 更新配置项
   */
  async update(id: number, dto: Partial<CreateSystemConfigDto>): Promise<SystemConfigEntity> {
    const config = await this.configRepository.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException('配置项不存在');
    }

    // 系统配置不能修改键名
    if (config.isSystem && dto.configKey && dto.configKey !== config.configKey) {
      throw new BadRequestException('系统配置键名不能修改');
    }

    // 检查配置键名是否存在
    if (dto.configKey && dto.configKey !== config.configKey) {
      if (await this.configRepository.isKeyExist(dto.configKey, id)) {
        throw new ConflictException('配置键名已存在');
      }
    }

    // 验证配置值格式
    if (dto.configValue !== undefined) {
      const configType = dto.configType || config.configType;
      this.validateConfigValue(dto.configValue, configType);
    }

    // 更新配置信息
    Object.assign(config, dto);
    const updated = await this.configRepository.save(config);

    // 发送事件
    this.eventEmitter.emit('system-config.updated', { config: updated });

    // 清除缓存
    await this.clearConfigCache(config.configKey);

    this.logger.log(`Updated config: ${updated.configName} (ID: ${updated.id})`);

    return updated;
  }

  /**
   * 删除配置项
   */
  async delete(id: number): Promise<void> {
    const config = await this.configRepository.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException('配置项不存在');
    }

    // 系统配置不能删除
    if (config.isSystem) {
      throw new BadRequestException('系统配置不能删除');
    }

    await this.configRepository.softDelete(id);

    // 发送事件
    this.eventEmitter.emit('system-config.deleted', { config });

    // 清除缓存
    await this.clearConfigCache(config.configKey);

    this.logger.log(`Deleted config: ${config.configName} (ID: ${id})`);
  }

  /**
   * 获取配置详情
   */
  async findById(id: number): Promise<SystemConfigEntity> {
    const config = await this.configRepository.findOne({ where: { id } });

    if (!config) {
      throw new NotFoundException('配置项不存在');
    }

    return config;
  }

  /**
   * 根据键名获取配置
   */
  async findByKey(configKey: string): Promise<SystemConfigEntity | null> {
    return this.configRepository.findByKey(configKey);
  }

  /**
   * 获取配置值
   */
  async getValue<T = any>(configKey: string): Promise<T | null> {
    // 尝试从缓存获取
    const cacheKey = `${this.CACHE_KEY_PREFIX}${configKey}`;
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 从数据库获取
    const config = await this.configRepository.findByKey(configKey);
    if (!config || !config.isEnabled) {
      return null;
    }

    const value = config.getParsedValue() as T;

    // 缓存配置值
    await this.cache.set(cacheKey, value, 3600); // 缓存1小时

    return value;
  }

  /**
   * 设置配置值
   */
  async setValue(configKey: string, value: string): Promise<SystemConfigEntity> {
    const config = await this.configRepository.findByKey(configKey);

    if (!config) {
      throw new NotFoundException('配置项不存在');
    }

    // 验证配置值格式
    this.validateConfigValue(value, config.configType);

    config.configValue = value;
    const updated = await this.configRepository.save(config);

    // 发送事件
    this.eventEmitter.emit('system-config.value-updated', {
      config: updated,
      oldValue: config.configValue,
      newValue: value,
    });

    // 清除缓存
    await this.clearConfigCache(configKey);

    this.logger.log(`Updated config value: ${configKey} = ${value}`);

    return updated;
  }

  /**
   * 批量更新配置值
   */
  async batchUpdateValues(dto: BatchUpdateConfigDto): Promise<void> {
    const keys = Object.keys(dto.configs);
    const configs = await this.configRepository.find({
      where: keys.map((key) => ({ configKey: key })),
    });

    for (const config of configs) {
      const value = dto.configs[config.configKey];
      if (value !== undefined) {
        // 验证配置值格式
        this.validateConfigValue(value, config.configType);
        config.configValue = value;
      }
    }

    await this.configRepository.save(configs as any);

    // 发送事件
    this.eventEmitter.emit('system-config.batch-updated', { configs });

    // 清除所有缓存
    await this.clearConfigCache();

    this.logger.log(`Batch updated ${configs.length} config values`);
  }

  /**
   * 查询配置列表
   */
  // @ts-ignore - Override base class method with different signature
  async findAll(query: QuerySystemConfigDto): Promise<PaginationResult<SystemConfigEntity>> {
    const [items, totalItems] = await this.configRepository.findWithQuery(query);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: query.limit || 10,
        totalPages: Math.ceil(totalItems / (query.limit || 10)),
        currentPage: query.page || 1,
      },
    };
  }

  /**
   * 获取所有启用的配置
   */
  async findEnabled(): Promise<SystemConfigEntity[]> {
    return this.configRepository.findEnabled();
  }

  /**
   * 获取配置映射（键值对）
   */
  async getConfigMap(keys?: string[]): Promise<Record<string, any>> {
    // 尝试从缓存获取
    if (!keys || keys.length === 0) {
      const cached = await this.cache.get<Record<string, any>>(this.CACHE_ALL_KEY);
      if (cached) {
        return cached;
      }
    }

    // 从数据库获取
    const configMap = await this.configRepository.getConfigMap(keys);

    // 缓存所有配置
    if (!keys || keys.length === 0) {
      await this.cache.set(this.CACHE_ALL_KEY, configMap, 3600);
    }

    return configMap;
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: number): Promise<SystemConfigEntity> {
    const config = await this.findById(id);

    if (config.isSystem) {
      throw new BadRequestException('系统配置不能修改状态');
    }

    config.isEnabled = !config.isEnabled;
    const updated = await this.configRepository.save(config);

    // 发送事件
    this.eventEmitter.emit('system-config.toggled', { config: updated });

    // 清除缓存
    await this.clearConfigCache(config.configKey);

    this.logger.log(
      `Toggled config status: ${updated.configName} -> ${updated.isEnabled ? 'enabled' : 'disabled'}`,
    );

    return updated;
  }

  /**
   * 验证配置值格式
   */
  private validateConfigValue(value: string | undefined, type?: ConfigType): void {
    if (!value || !type) {
      return;
    }

    try {
      switch (type) {
        case ConfigType.NUMBER:
          if (isNaN(Number(value))) {
            throw new Error('配置值必须是数字');
          }
          break;
        case ConfigType.BOOLEAN:
          if (!['true', 'false', '0', '1'].includes(value.toLowerCase())) {
            throw new Error('配置值必须是布尔值 (true/false/0/1)');
          }
          break;
        case ConfigType.JSON:
        case ConfigType.ARRAY:
          JSON.parse(value);
          break;
      }
    } catch (error) {
      throw new BadRequestException(`配置值格式错误: ${error.message}`);
    }
  }

  /**
   * 清除配置缓存
   */
  private async clearConfigCache(configKey?: string): Promise<void> {
    if (configKey) {
      await this.cache.del(`${this.CACHE_KEY_PREFIX}${configKey}`);
    }
    await this.cache.del(this.CACHE_ALL_KEY);
  }
}
