import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { PaginationResult } from '~/core/base/base.repository';
import { DictItemEntity, DictItemStatus } from '../entities/dict-item.entity';
import { DictItemRepository } from '../repositories/dict-item.repository';
import { DictTypeRepository } from '../repositories/dict-type.repository';
import { CreateDictItemDto, QueryDictItemDto, BatchCreateDictItemDto } from '../dto/dict-item.dto';

@Injectable()
export class DictItemService extends BaseService<DictItemEntity> {
  protected repository: DictItemRepository;

  constructor(
    private readonly dictItemRepository: DictItemRepository,
    private readonly dictTypeRepository: DictTypeRepository,
    logger: LoggerService,
    cache: CacheService,
  ) {
    super();
    this.repository = dictItemRepository;
    this.logger = logger;
    this.cache = cache;
    this.logger.setContext(DictItemService.name);
  }

  /**
   * 创建字典项
   */
  async create(dto: CreateDictItemDto): Promise<DictItemEntity> {
    // 检查字典类型是否存在
    const dictType = await this.dictTypeRepository.findOne({
      where: { id: dto.dictTypeId },
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    if (!dictType.isEnabled) {
      throw new BadRequestException('字典类型已禁用');
    }

    // 检查字典项值是否存在
    if (await this.dictItemRepository.isValueExist(dto.dictTypeId, dto.value)) {
      throw new ConflictException('字典项值已存在');
    }

    // 如果设置为默认值,取消其他默认值
    if (dto.isDefault) {
      await this.clearDefaultValue(dto.dictTypeId);
    }

    // 创建字典项
    const dictItem = this.dictItemRepository.create({
      ...dto,
      status: dto.status || DictItemStatus.ENABLED,
      isDefault: dto.isDefault || false,
      sort: dto.sort !== undefined ? dto.sort : 0,
    });

    const saved = await this.dictItemRepository.save(dictItem);

    // 清除缓存
    await this.clearCache();

    this.logger.log(
      `Created dict item: ${saved.label} (${saved.value}) for type ${dto.dictTypeId}`,
    );

    return saved;
  }

  /**
   * 批量创建字典项
   */
  async batchCreate(dto: BatchCreateDictItemDto): Promise<DictItemEntity[]> {
    // 检查字典类型是否存在
    const dictType = await this.dictTypeRepository.findOne({
      where: { id: dto.dictTypeId },
    });

    if (!dictType) {
      throw new NotFoundException('字典类型不存在');
    }

    if (!dictType.isEnabled) {
      throw new BadRequestException('字典类型已禁用');
    }

    // 检查值是否重复
    const values = dto.items.map((item) => item.value);
    const uniqueValues = new Set(values);
    if (values.length !== uniqueValues.size) {
      throw new BadRequestException('批量创建的字典项值存在重复');
    }

    // 检查是否与已存在的值冲突
    for (const item of dto.items) {
      if (await this.dictItemRepository.isValueExist(dto.dictTypeId, item.value)) {
        throw new ConflictException(`字典项值 "${item.value}" 已存在`);
      }
    }

    // 创建字典项
    const dictItems = dto.items.map((item) =>
      this.dictItemRepository.create({
        ...item,
        dictTypeId: dto.dictTypeId,
        status: item.status || DictItemStatus.ENABLED,
        isDefault: item.isDefault || false,
        sort: item.sort !== undefined ? item.sort : 0,
      }),
    );

    const saved = await this.dictItemRepository.createBatch(dictItems);

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Batch created ${saved.length} dict items for type ${dto.dictTypeId}`);

    return saved;
  }

  /**
   * 更新字典项
   */
  async update(id: number, dto: Partial<CreateDictItemDto>): Promise<DictItemEntity> {
    const dictItem = await this.dictItemRepository.findOne({
      where: { id },
    });

    if (!dictItem) {
      throw new NotFoundException('字典项不存在');
    }

    // 检查字典项值是否存在
    if (dto.value && dto.value !== dictItem.value) {
      if (await this.dictItemRepository.isValueExist(dictItem.dictTypeId, dto.value, id)) {
        throw new ConflictException('字典项值已存在');
      }
    }

    // 如果设置为默认值,取消其他默认值
    if (dto.isDefault && !dictItem.isDefault) {
      await this.clearDefaultValue(dictItem.dictTypeId, id);
    }

    // 更新字典项信息
    Object.assign(dictItem, dto);
    const updated = await this.dictItemRepository.save(dictItem);

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Updated dict item: ${updated.label} (ID: ${updated.id})`);

    return updated;
  }

  /**
   * 删除字典项
   */
  async delete(id: number): Promise<void> {
    const dictItem = await this.dictItemRepository.findOne({
      where: { id },
    });

    if (!dictItem) {
      throw new NotFoundException('字典项不存在');
    }

    await this.dictItemRepository.softDelete(id);

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Deleted dict item: ${dictItem.label} (ID: ${id})`);
  }

  /**
   * 获取字典项详情
   */
  async findById(id: number): Promise<DictItemEntity> {
    const dictItem = await this.dictItemRepository.findOne({
      where: { id },
      relations: ['dictType'],
    });

    if (!dictItem) {
      throw new NotFoundException('字典项不存在');
    }

    return dictItem;
  }

  /**
   * 查询字典项列表
   */
  // @ts-ignore - Override base class method with different signature
  async findAll(query: QueryDictItemDto): Promise<PaginationResult<DictItemEntity>> {
    const [items, totalItems] = await this.dictItemRepository.findWithQuery(query);

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
   * 根据字典类型ID获取启用的字典项
   */
  async findEnabledByTypeId(dictTypeId: number): Promise<DictItemEntity[]> {
    return this.dictItemRepository.findEnabledByTypeId(dictTypeId);
  }

  /**
   * 根据字典类型编码获取启用的字典项
   */
  async findEnabledByTypeCode(typeCode: string): Promise<DictItemEntity[]> {
    return this.dictItemRepository.findEnabledByTypeCode(typeCode);
  }

  /**
   * 获取默认值
   */
  async findDefaultByTypeId(dictTypeId: number): Promise<DictItemEntity | null> {
    return this.dictItemRepository.findDefaultByTypeId(dictTypeId);
  }

  /**
   * 根据字典类型编码和值获取字典项
   */
  async findByTypeCodeAndValue(typeCode: string, value: string): Promise<DictItemEntity | null> {
    return this.dictItemRepository.findByTypeCodeAndValue(typeCode, value);
  }

  /**
   * 切换启用状态
   */
  async toggleStatus(id: number): Promise<DictItemEntity> {
    const dictItem = await this.findById(id);

    dictItem.status =
      dictItem.status === DictItemStatus.ENABLED ? DictItemStatus.DISABLED : DictItemStatus.ENABLED;

    const updated = await this.dictItemRepository.save(dictItem);

    // 清除缓存
    await this.clearCache();

    this.logger.log(`Toggled dict item status: ${updated.label} -> ${updated.status}`);

    return updated;
  }

  /**
   * 清除默认值
   */
  private async clearDefaultValue(dictTypeId: number, excludeId?: number): Promise<void> {
    const items = await this.dictItemRepository.find({
      where: { dictTypeId, isDefault: true },
    });

    for (const item of items) {
      if (excludeId && item.id === excludeId) {
        continue;
      }
      item.isDefault = false;
      await this.dictItemRepository.save(item);
    }
  }
}
