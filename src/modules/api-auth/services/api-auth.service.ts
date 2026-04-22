import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { ApiCallLogEntity } from '../entities/api-call-log.entity';
import { ApiAppRepository } from '../repositories/api-app.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { ApiCallLogRepository } from '../repositories/api-call-log.repository';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';

// 配置常量
const API_AUTH_CONSTANTS = {
  MAX_KEYS_PER_APP: 5, // 每个应用最大密钥数
  KEY_CACHE_TTL: 300, // 密钥缓存时间（秒）
  RATE_LIMIT_HOUR_TTL: 3600, // 小时限流缓存时间
  RATE_LIMIT_DAY_TTL: 86400, // 日限流缓存时间
} as const;

@Injectable()
export class ApiAuthService {
  private readonly logger = new Logger(ApiAuthService.name);
  constructor(
    private readonly appRepository: ApiAppRepository,
    private readonly keyRepository: ApiKeyRepository,
    private readonly logRepository: ApiCallLogRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取API应用列表
   */
  async getApps(options: { skip?: number; take?: number }) {
    const page = Math.floor((options.skip || 0) / (options.take || 10)) + 1;
    const result = await this.appRepository.paginate(
      {
        page,
        limit: options.take || 10,
      },
      {
        order: { createdAt: 'DESC' },
      },
    );

    return {
      items: result.items,
      total: result.meta.totalItems,
      page: result.meta.currentPage,
      limit: result.meta.itemsPerPage,
    };
  }

  /**
   * 获取API应用详情
   */
  async getApp(appId: number): Promise<ApiAppEntity> {
    const app = await this.appRepository.findById(appId);

    if (!app) {
      throw new BadRequestException('应用不存在');
    }

    return app;
  }

  /**
   * 创建API应用
   */
  async createApp(dto: CreateApiAppDto): Promise<ApiAppEntity> {
    // 检查名称是否存在
    if (await this.appRepository.isNameExist(dto.name)) {
      throw new BadRequestException('应用名称已存在');
    }

    const app = this.appRepository.create(dto);
    return this.appRepository.save(app);
  }

  /**
   * 更新API应用
   */
  async updateApp(appId: number, dto: Partial<CreateApiAppDto>): Promise<ApiAppEntity> {
    const app = await this.getApp(appId);
    Object.assign(app, dto);
    return this.appRepository.save(app);
  }

  /**
   * 删除API应用
   */
  async deleteApp(appId: number): Promise<void> {
    await this.getApp(appId); // 检查应用是否存在
    await this.appRepository.update(appId, { isActive: false });

    // 删除应用时，禁用所有相关密钥
    const keys = await this.keyRepository.findByAppId(appId);
    for (const key of keys) {
      await this.keyRepository.revokeKey(key.id);
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

    const app = await this.appRepository.findById(dto.appId);

    if (!app || !app.isActive) {
      throw new BadRequestException('应用不存在或已禁用');
    }

    // 检查密钥数量限制
    const activeKeys = await this.keyRepository.findActiveKeysByAppId(dto.appId);

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
  async validateApiKey(apiKey: string): Promise<ApiAppEntity | null> {
    const keyHash = ApiKeyEntity.hashKey(apiKey);
    const cacheKey = `api_key:${keyHash}`;
    const cached = await this.cacheService.get<ApiAppEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    // 查询密钥
    const key = await this.keyRepository.findByKeyHash(keyHash);

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

    // 更新最后使用时间（异步，不等待）
    this.keyRepository.updateUsageStats(key.id);

    // 缓存密钥验证结果
    await this.cacheService.set(cacheKey, key.app, API_AUTH_CONSTANTS.KEY_CACHE_TTL);

    return key.app;
  }

  /**
   * 记录API调用
   */
  async recordApiCall(appId: number, details: Partial<ApiCallLogEntity>): Promise<void> {
    const log = this.logRepository.create({
      appId,
      ...details,
    });

    // 异步保存，不阻塞主流程，但要有更好的错误处理
    this.logRepository.save(log).catch((error) => {
      this.logger.error('Failed to save API call log', {
        error: error.message,
        appId,
        endpoint: details.endpoint,
        stack: error.stack,
      });

      // TODO: 接入监控系统（Sentry/DataDog）进行告警
      // this.monitoringService.reportError(error, { context: 'api_call_log', appId });
    });

    // 更新应用的调用统计（异步）
    this.appRepository.updateCallStats(appId).catch((error) => {
      this.logger.error('Failed to update app statistics', {
        error: error.message,
        appId,
      });
    });
  }

  /**
   * 检查API限流（使用原子操作防止并发问题）
   */
  async checkRateLimit(appId: number): Promise<boolean> {
    const app = await this.appRepository.findById(appId);

    if (!app) {
      return false;
    }

    // 使用当前缓存实现滑动窗口限流
    const hourKey = `rate_limit:hour:${appId}`;
    const dayKey = `rate_limit:day:${appId}`;

    // 使用原子增加操作，先增加再检查
    const [hourCount, dayCount] = await Promise.all([
      this.cacheService.increment(hourKey, API_AUTH_CONSTANTS.RATE_LIMIT_HOUR_TTL),
      this.cacheService.increment(dayKey, API_AUTH_CONSTANTS.RATE_LIMIT_DAY_TTL),
    ]);

    // 如果超过限制，回滚计数并抛出异常
    if (hourCount > app.rateLimitPerHour) {
      // 回滚计数
      await this.cacheService.decrement(hourKey);
      await this.cacheService.decrement(dayKey);

      this.logger.warn(`Rate limit exceeded for app ${appId}: hourly limit`, {
        appId,
        hourCount,
        limit: app.rateLimitPerHour,
      });

      throw new UnauthorizedException('超过每小时API调用限制');
    }

    if (dayCount > app.rateLimitPerDay) {
      // 回滚计数（小时计数不需要回滚，因为已经在限制内）
      await this.cacheService.decrement(dayKey);

      this.logger.warn(`Rate limit exceeded for app ${appId}: daily limit`, {
        appId,
        dayCount,
        limit: app.rateLimitPerDay,
      });

      throw new UnauthorizedException('超过每日API调用限制');
    }

    return true;
  }

  /**
   * 获取API使用统计
   */
  async getApiStatistics(appId: number, period: 'hour' | 'day' | 'month') {
    const query = this.logRepository
      .createQueryBuilder('log')
      .where('log.appId = :appId', { appId })
      .select([
        'log.endpoint as endpoint',
        'log.method as method',
        'COUNT(*) as count',
        'AVG(log.responseTime) as avgResponseTime',
        'MAX(log.responseTime) as maxResponseTime',
        'MIN(log.responseTime) as minResponseTime',
        'SUM(CASE WHEN log.statusCode >= 400 THEN 1 ELSE 0 END) as errorCount',
      ])
      .groupBy('log.endpoint, log.method');

    // 根据时间段筛选
    const now = new Date();
    switch (period) {
      case 'hour':
        query.andWhere('log.createdAt >= :time', {
          time: new Date(now.getTime() - 3600000),
        });
        break;
      case 'day':
        query.andWhere('log.createdAt >= :time', {
          time: new Date(now.getTime() - 86400000),
        });
        break;
      case 'month':
        query.andWhere('log.createdAt >= :time', {
          time: new Date(now.getTime() - 2592000000),
        });
        break;
    }

    return query.getRawMany();
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(keyId: number): Promise<void> {
    const key = await this.keyRepository.findById(keyId);
    await this.keyRepository.revokeKey(keyId);

    if (key) {
      await this.cacheService.del(`api_key:${key.keyHash}`);
    }
  }

  /**
   * 获取应用的所有密钥
   */
  async getAppKeys(appId: number): Promise<ApiKeyEntity[]> {
    return this.keyRepository.findByAppId(appId);
  }
}
