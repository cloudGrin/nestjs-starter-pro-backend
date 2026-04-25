import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiAppDto } from '../dto/update-api-app.dto';
import { QueryApiAppsDto } from '../dto/query-api-apps.dto';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';

// 配置常量
const API_AUTH_CONSTANTS = {
  MAX_KEYS_PER_APP: 5, // 每个应用最大密钥数
  KEY_CACHE_TTL: 300, // 密钥缓存时间（秒）
} as const;

export interface ValidatedApiApp {
  id: number;
  name: string;
  ownerId?: number;
  scopes: string[];
  type: 'api-app';
}

@Injectable()
export class ApiAuthService {
  constructor(
    @InjectRepository(ApiAppEntity)
    private readonly appRepository: Repository<ApiAppEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly keyRepository: Repository<ApiKeyEntity>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取API应用列表
   */
  async getApps(query: QueryApiAppsDto = {}): Promise<PaginationResult<ApiAppEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    return this.paginateApps(
      {
        page,
        limit,
      },
      {
        order: { createdAt: 'DESC' },
      },
    );
  }

  /**
   * 获取API应用详情
   */
  async getApp(appId: number): Promise<ApiAppEntity> {
    const app = await this.appRepository.findOne({
      where: { id: appId },
    });

    if (!app) {
      throw new NotFoundException('应用不存在');
    }

    return app;
  }

  /**
   * 创建API应用
   */
  async createApp(dto: CreateApiAppDto, ownerId?: number): Promise<ApiAppEntity> {
    // 检查名称是否存在
    if (await this.isAppNameExist(dto.name)) {
      throw new BadRequestException('应用名称已存在');
    }

    const app = this.appRepository.create(ownerId === undefined ? dto : { ...dto, ownerId });
    return this.appRepository.save(app);
  }

  /**
   * 更新API应用
   */
  async updateApp(appId: number, dto: UpdateApiAppDto): Promise<ApiAppEntity> {
    const app = await this.getApp(appId);
    Object.assign(app, dto);
    const updated = await this.appRepository.save(app);

    if (dto.scopes !== undefined || 'isActive' in dto) {
      await this.clearAppKeyCache(appId);
    }

    return updated;
  }

  /**
   * 删除API应用
   */
  async deleteApp(appId: number): Promise<void> {
    await this.getApp(appId); // 检查应用是否存在
    await this.appRepository.update(appId, { isActive: false });

    // 删除应用时，禁用所有相关密钥
    const keys = await this.findAppKeys(appId);
    for (const key of keys) {
      await this.keyRepository.update(key.id, { isActive: false });
      await this.cacheService.del(`api_key:${key.keyHash}`);
    }
  }

  /**
   * 生成API密钥
   */
  async generateApiKey(dto: CreateApiKeyDto): Promise<ApiKeyEntity> {
    if (!dto.appId) {
      throw new BadRequestException('应用ID不能为空');
    }

    const app = await this.appRepository.findOne({
      where: { id: dto.appId },
    });

    if (!app || !app.isActive) {
      throw new BadRequestException('应用不存在或已禁用');
    }

    // 检查密钥数量限制
    const activeKeys = await this.keyRepository.find({
      where: { appId: dto.appId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (activeKeys.length >= API_AUTH_CONSTANTS.MAX_KEYS_PER_APP) {
      throw new BadRequestException(
        `每个应用最多只能有${API_AUTH_CONSTANTS.MAX_KEYS_PER_APP}个有效密钥`,
      );
    }

    const key = this.keyRepository.create({
      ...dto,
      appId: dto.appId,
      prefix: dto.environment === 'production' ? 'sk_live' : 'sk_test',
    });

    // 生成密钥（BeforeInsert钩子会自动调用）
    const savedKey = await this.keyRepository.save(key);

    // 返回包含原始密钥的对象（仅此一次）
    return {
      ...savedKey,
      rawKey: savedKey.rawKey,
    } as ApiKeyEntity;
  }

  /**
   * 验证API密钥
   */
  async validateApiKey(apiKey: string): Promise<ValidatedApiApp | null> {
    const keyHash = ApiKeyEntity.hashKey(apiKey);
    const cacheKey = `api_key:${keyHash}`;
    const cached = await this.cacheService.get<ValidatedApiApp>(cacheKey);
    if (cached) {
      return cached;
    }

    // 查询密钥
    const key = await this.keyRepository.findOne({
      where: { keyHash },
      relations: ['app'],
    });

    if (!key || !key.isActive) {
      return null;
    }

    // 检查是否过期
    if (key.expiresAt && new Date() > key.expiresAt) {
      return null;
    }

    // 检查应用是否激活
    if (!key.app.isActive) {
      return null;
    }

    const validatedApp: ValidatedApiApp = {
      id: key.app.id,
      name: key.app.name,
      ownerId: key.app.ownerId,
      scopes: key.scopes ?? key.app.scopes ?? [],
      type: 'api-app',
    };

    // 更新最后使用时间（异步，不等待）
    await Promise.all([
      this.keyRepository.increment({ id: key.id }, 'usageCount', 1),
      this.keyRepository.update(key.id, { lastUsedAt: new Date() }),
    ]);

    // 缓存密钥验证结果
    await this.cacheService.set(cacheKey, validatedApp, API_AUTH_CONSTANTS.KEY_CACHE_TTL);

    return validatedApp;
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(keyId: number): Promise<void> {
    const key = await this.keyRepository.findOne({
      where: { id: keyId },
    });
    await this.keyRepository.update(keyId, { isActive: false });

    if (key) {
      await this.cacheService.del(`api_key:${key.keyHash}`);
    }
  }

  /**
   * 获取应用的所有密钥
   */
  async getAppKeys(appId: number): Promise<ApiKeyEntity[]> {
    return this.findAppKeys(appId);
  }

  private async findAppKeys(appId: number): Promise<ApiKeyEntity[]> {
    return this.keyRepository.find({
      where: { appId },
      order: { createdAt: 'DESC' },
    });
  }

  private async clearAppKeyCache(appId: number): Promise<void> {
    const keys = await this.findAppKeys(appId);
    await Promise.all(keys.map((key) => this.cacheService.del(`api_key:${key.keyHash}`)));
  }

  private async paginateApps(
    options: PaginationOptions,
    findOptions?: Parameters<Repository<ApiAppEntity>['findAndCount']>[0],
  ): Promise<PaginationResult<ApiAppEntity>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.appRepository.findAndCount({
      ...findOptions,
      skip,
      take: limit,
      order: options.sort
        ? ({ [options.sort]: options.order || 'ASC' } as NonNullable<
            Parameters<Repository<ApiAppEntity>['findAndCount']>[0]
          >['order'])
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

  private async isAppNameExist(name: string): Promise<boolean> {
    const count = await this.appRepository.count({
      where: { name },
    });
    return count > 0;
  }
}
