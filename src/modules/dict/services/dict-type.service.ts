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
import { DictTypeEntity, DictSource } from '../entities/dict-type.entity';
import { DictTypeRepository } from '../repositories/dict-type.repository';
import { CreateDictTypeDto, QueryDictTypeDto } from '../dto/dict-type.dto';
import { Cacheable } from '~/core/decorators';

@Injectable()
export class DictTypeService extends BaseService<DictTypeEntity> {
  protected repository: DictTypeRepository;

  constructor(
    private readonly dictTypeRepository: DictTypeRepository,
    logger: LoggerService,
    cache: CacheService,
    eventEmitter: EventEmitter2,
  ) {
    super();
    this.repository = dictTypeRepository;
    this.logger = logger;
    this.cache = cache;
    this.eventEmitter = eventEmitter;
    this.logger.setContext(DictTypeService.name);
  }

  /**
   * 创建字典类型
   */
  async create(dto: CreateDictTypeDto): Promise<DictTypeEntity> {
    // 检查字典编码是否存在
    if (await this.dictTypeRepository.isCodeExist(dto.code)) {
      throw new ConflictException('字典编码已存在');
    }

    // 创建字典类型
    const dictType = this.dictTypeRepository.create({
      ...dto,
      isSystem: false,
      source: dto.source || DictSource.CUSTOM,
      isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : true,
      sort: dto.sort !== undefined ? dto.sort : 0,
    });

    const saved = await this.dictTypeRepository.save(dictType);

    // 发送事件
    this.eventEmitter.emit('dict-type.created', { dictType: saved });

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Created dict type: ${saved.name} (${saved.code})`);

    return saved;
  }

  /**
   * 更新字典类型
   */
  async update(id: number, dto: Partial<CreateDictTypeDto>): Promise<DictTypeEntity> {
    const dictType = await this.dictTypeRepository.findOne({
      where: { id },
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    // 系统字典不能修改
    if (dictType.isSystem) {
      throw new BadRequestException('系统字典类型不能修改');
    }

    // 检查字典编码是否存在
    if (dto.code && dto.code !== dictType.code) {
      if (await this.dictTypeRepository.isCodeExist(dto.code, id)) {
        throw new ConflictException('字典编码已存在');
      }
    }

    // 更新字典类型信息
    Object.assign(dictType, dto);
    const updated = await this.dictTypeRepository.save(dictType);

    // 发送事件
    this.eventEmitter.emit('dict-type.updated', { dictType: updated });

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Updated dict type: ${updated.name} (ID: ${updated.id})`);

    return updated;
  }

  /**
   * 删除字典类型
   */
  async delete(id: number): Promise<void> {
    const dictType = await this.dictTypeRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    // 系统字典不能删除
    if (dictType.isSystem) {
      throw new BadRequestException('系统字典类型不能删除');
    }

    // 检查是否有字典项
    if (dictType.items && dictType.items.length > 0) {
      throw new BadRequestException('该字典类型下存在字典项，不能删除');
    }

    await this.dictTypeRepository.softDelete(id);

    // 发送事件
    this.eventEmitter.emit('dict-type.deleted', { dictType });

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Deleted dict type: ${dictType.name} (ID: ${id})`);
  }

  /**
   * 获取字典类型详情
   */
  @Cacheable({ prefix: 'dict:type:id', argIndexes: [0], ttl: 1800 })
  async findById(id: number): Promise<DictTypeEntity> {
    const dictType = await this.dictTypeRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    return dictType;
  }

  /**
   * 根据编码获取字典类型
   */
  @Cacheable({ prefix: 'dict:type:code', argIndexes: [0], ttl: 1800 })
  async findByCode(code: string): Promise<DictTypeEntity | null> {
    return this.dictTypeRepository.findByCode(code);
  }

  /**
   * 查询字典类型列表
   */
  // @ts-ignore - Override base class method with different signature
  async findAll(query: QueryDictTypeDto): Promise<PaginationResult<DictTypeEntity>> {
    const [items, totalItems] = await this.dictTypeRepository.findWithQuery(query);

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
   * 获取所有启用的字典类型
   */
  @Cacheable({ prefix: 'dict:type:enabled', ttl: 1800 })
  async findEnabled(): Promise<DictTypeEntity[]> {
    return this.dictTypeRepository.findEnabled();
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: number): Promise<DictTypeEntity> {
    const dictType = await this.findById(id);

    if (dictType.isSystem) {
      throw new BadRequestException('系统字典类型不能修改状态');
    }

    dictType.isEnabled = !dictType.isEnabled;
    const updated = await this.dictTypeRepository.save(dictType);

    // 发送事件
    this.eventEmitter.emit('dict-type.toggled', { dictType: updated });

    // 清除缓存
    await this.clearCache();

    this.logger.log(
      `Toggled dict type status: ${updated.name} -> ${updated.isEnabled ? 'enabled' : 'disabled'}`,
    );

    return updated;
  }
}
