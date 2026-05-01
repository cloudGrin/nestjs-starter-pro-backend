import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Not, Repository } from 'typeorm';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { ApiAccessLogEntity } from '../entities/api-access-log.entity';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiAppDto } from '../dto/update-api-app.dto';
import { QueryApiAppsDto } from '../dto/query-api-apps.dto';
import { QueryApiAccessLogsDto } from '../dto/query-api-access-logs.dto';
import { ApiScopeGroup } from '../constants/api-scopes.constant';
import { OpenApiScopeRegistryService } from './open-api-scope-registry.service';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';

// 配置常量
const API_AUTH_CONSTANTS = {
  MAX_KEYS_PER_APP: 5, // 每个应用最大密钥数
  KEY_CACHE_TTL: 300, // 密钥缓存时间（秒）
} as const;
const API_APP_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name']);

export interface ValidatedApiApp {
  id: number;
  name: string;
  ownerId?: number;
  scopes: string[];
  keyId?: number;
  keyName?: string;
  keyPrefix?: string;
  keySuffix?: string;
  type: 'api-app';
}

export type RecordApiAccessLogInput = Pick<
  ApiAccessLogEntity,
  | 'appId'
  | 'keyId'
  | 'keyName'
  | 'keyPrefix'
  | 'keySuffix'
  | 'method'
  | 'path'
  | 'statusCode'
  | 'durationMs'
  | 'ip'
  | 'userAgent'
>;

interface ApiKeyCacheEntry {
  keyId: number;
  app: ValidatedApiApp;
}

@Injectable()
export class ApiAuthService {
  constructor(
    @InjectRepository(ApiAppEntity)
    private readonly appRepository: Repository<ApiAppEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly keyRepository: Repository<ApiKeyEntity>,
    @InjectRepository(ApiAccessLogEntity)
    private readonly accessLogRepository: Repository<ApiAccessLogEntity>,
    private readonly cacheService: CacheService,
    private readonly openApiScopeRegistry: OpenApiScopeRegistryService,
  ) {}

  /**
   * 获取开放 API 权限范围定义
   */
  getApiScopes(): ApiScopeGroup[] {
    return this.openApiScopeRegistry.getApiScopeGroups();
  }

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
        sort: query.sort && API_APP_SORT_FIELDS.has(query.sort) ? query.sort : undefined,
        order: query.order,
      },
      {
        where: { isActive: true },
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

    if (!app || !app.isActive) {
      throw new NotFoundException('应用不存在');
    }

    return app;
  }

  /**
   * 创建API应用
   */
  async createApp(dto: CreateApiAppDto, ownerId?: number): Promise<ApiAppEntity> {
    this.validateRegisteredScopes(dto.scopes);

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
    const nameChanged = dto.name !== undefined && dto.name !== app.name;
    this.validateRegisteredScopes(dto.scopes);

    if (dto.name && nameChanged && (await this.isAppNameExist(dto.name, appId))) {
      throw new BadRequestException('应用名称已存在');
    }

    Object.assign(app, dto);
    const updated = await this.appRepository.save(app);

    if (nameChanged || dto.scopes !== undefined || 'isActive' in dto) {
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

    this.validateRegisteredScopes(dto.scopes);

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
    const cached = await this.cacheService.get<ApiKeyCacheEntry>(cacheKey);
    if (cached) {
      await this.recordKeyUsage(cached.keyId);
      return {
        ...cached.app,
        keyId: cached.app.keyId ?? cached.keyId,
      };
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
      keyId: key.id,
      keyName: key.name,
      keyPrefix: key.prefix,
      keySuffix: key.suffix,
      type: 'api-app',
    };

    // 更新最后使用时间（异步，不等待）
    await this.recordKeyUsage(key.id);

    const cacheTtl = this.getApiKeyCacheTtl(key.expiresAt);
    if (cacheTtl > 0) {
      await this.cacheService.set(cacheKey, { keyId: key.id, app: validatedApp }, cacheTtl);
    }

    return validatedApp;
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(keyId: number): Promise<void> {
    const key = await this.keyRepository.findOne({
      where: { id: keyId },
    });
    if (!key) {
      throw new NotFoundException('API密钥不存在');
    }

    await this.keyRepository.update(keyId, { isActive: false });

    await this.cacheService.del(`api_key:${key.keyHash}`);
  }

  /**
   * 获取应用的所有密钥
   */
  async getAppKeys(appId: number): Promise<ApiKeyEntity[]> {
    await this.getApp(appId);
    return this.findAppKeys(appId);
  }

  async recordAccessLog(input: RecordApiAccessLogInput): Promise<ApiAccessLogEntity> {
    const log = this.accessLogRepository.create(input);
    return this.accessLogRepository.save(log);
  }

  async getAccessLogs(
    appId: number,
    query: QueryApiAccessLogsDto = {},
  ): Promise<PaginationResult<ApiAccessLogEntity>> {
    await this.getApp(appId);

    const where: FindOptionsWhere<ApiAccessLogEntity> = { appId };
    if (query.keyId !== undefined) {
      where.keyId = query.keyId;
    }
    if (query.statusCode !== undefined) {
      where.statusCode = query.statusCode;
    }
    if (query.path?.trim()) {
      where.path = Like(`%${query.path.trim()}%`);
    }

    return this.paginateAccessLogs(
      {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      },
      {
        where,
        order: { createdAt: 'DESC' },
      },
    );
  }

  private getApiKeyCacheTtl(expiresAt?: Date): number {
    if (!expiresAt) {
      return API_AUTH_CONSTANTS.KEY_CACHE_TTL;
    }

    const secondsUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    return Math.min(API_AUTH_CONSTANTS.KEY_CACHE_TTL, Math.max(0, secondsUntilExpiry));
  }

  private async findAppKeys(appId: number): Promise<ApiKeyEntity[]> {
    return this.keyRepository.find({
      where: { appId },
      order: { createdAt: 'DESC' },
    });
  }

  private validateRegisteredScopes(scopes?: string[]): void {
    if (!scopes?.length) {
      return;
    }

    if (scopes.includes('*')) {
      throw new BadRequestException('不支持配置API通配符权限: *');
    }

    const registeredScopes = this.openApiScopeRegistry.getRegisteredScopeCodes();
    const invalidScopes = scopes.filter((scope) => !registeredScopes.has(scope));

    if (invalidScopes.length > 0) {
      throw new BadRequestException(`未知API权限范围: ${invalidScopes.join(', ')}`);
    }
  }

  private async clearAppKeyCache(appId: number): Promise<void> {
    const keys = await this.findAppKeys(appId);
    await Promise.all(keys.map((key) => this.cacheService.del(`api_key:${key.keyHash}`)));
  }

  private async recordKeyUsage(keyId: number): Promise<void> {
    await Promise.all([
      this.keyRepository.increment({ id: keyId }, 'usageCount', 1),
      this.keyRepository.update(keyId, { lastUsedAt: new Date() }),
    ]);
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

  private async paginateAccessLogs(
    options: PaginationOptions,
    findOptions?: Parameters<Repository<ApiAccessLogEntity>['findAndCount']>[0],
  ): Promise<PaginationResult<ApiAccessLogEntity>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.accessLogRepository.findAndCount({
      ...findOptions,
      skip,
      take: limit,
      order: findOptions?.order,
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

  private async isAppNameExist(name: string, excludeId?: number): Promise<boolean> {
    const count = await this.appRepository.count({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
    return count > 0;
  }
}
