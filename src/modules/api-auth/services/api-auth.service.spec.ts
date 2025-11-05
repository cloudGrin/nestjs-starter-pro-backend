import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ApiAuthService } from './api-auth.service';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { ApiCallLogEntity } from '../entities/api-call-log.entity';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto, ApiKeyEnvironment } from '../dto/create-api-key.dto';

describe('ApiAuthService', () => {
  let service: ApiAuthService;
  let appRepository: jest.Mocked<Repository<ApiAppEntity>>;
  let keyRepository: jest.Mocked<Repository<ApiKeyEntity>>;
  let logRepository: jest.Mocked<Repository<ApiCallLogEntity>>;
  let cacheService: jest.Mocked<CacheService>;

  // Mock 数据工厂
  const createMockApp = (overrides?: Partial<ApiAppEntity>): ApiAppEntity => {
    const app = new ApiAppEntity();
    app.id = 1;
    app.name = 'Test App';
    app.description = 'Test Description';
    app.scopes = ['read:users', 'read:orders'];
    app.rateLimitPerHour = 1000;
    app.rateLimitPerDay = 10000;
    app.isActive = true;
    app.totalCalls = 0;
    app.createdAt = new Date();
    app.updatedAt = new Date();
    return Object.assign(app, overrides);
  };

  const createMockKey = (overrides?: Partial<ApiKeyEntity>): ApiKeyEntity => {
    const key = new ApiKeyEntity();
    key.id = 1;
    key.name = 'Test Key';
    key.appId = 1;
    key.prefix = 'sk_live';
    key.suffix = 'abc1';
    key.keyHash = 'mock-hash';
    key.scopes = ['read:users'];
    key.isActive = true;
    key.usageCount = 0;
    key.createdAt = new Date();
    key.updatedAt = new Date();
    return Object.assign(key, overrides);
  };

  beforeEach(async () => {
    const mockAppRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    const mockKeyRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
    };

    const mockLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      increment: jest.fn(),
      decrement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiAuthService,
        {
          provide: getRepositoryToken(ApiAppEntity),
          useValue: mockAppRepository,
        },
        {
          provide: getRepositoryToken(ApiKeyEntity),
          useValue: mockKeyRepository,
        },
        {
          provide: getRepositoryToken(ApiCallLogEntity),
          useValue: mockLogRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ApiAuthService>(ApiAuthService);
    appRepository = module.get(getRepositoryToken(ApiAppEntity));
    keyRepository = module.get(getRepositoryToken(ApiKeyEntity));
    logRepository = module.get(getRepositoryToken(ApiCallLogEntity));
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApp', () => {
    it('应该成功创建API应用', async () => {
      const dto: CreateApiAppDto = {
        name: 'New App',
        description: 'Test App',
        scopes: ['read:users'],
      };

      const mockApp = createMockApp({ name: dto.name });

      appRepository.findOne.mockResolvedValue(null); // 应用名不存在
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await service.createApp(dto);

      expect(result).toEqual(mockApp);
      expect(appRepository.findOne).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(appRepository.save).toHaveBeenCalledWith(mockApp);
    });

    it('应该在应用名已存在时抛出异常', async () => {
      const dto: CreateApiAppDto = {
        name: 'Existing App',
      };

      const existingApp = createMockApp({ name: dto.name });
      appRepository.findOne.mockResolvedValue(existingApp);

      await expect(service.createApp(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(appRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('generateApiKey', () => {
    it('应该成功生成API密钥', async () => {
      const dto: CreateApiKeyDto = {
        appId: 1,
        name: 'Production Key',
        environment: ApiKeyEnvironment.PRODUCTION,
      };

      const mockApp = createMockApp();
      const mockKey = createMockKey({ rawKey: 'sk_live_testkey123' });

      appRepository.findOne.mockResolvedValue(mockApp);
      keyRepository.count.mockResolvedValue(2); // 当前有2个密钥
      keyRepository.create.mockReturnValue(mockKey);
      keyRepository.save.mockResolvedValue(mockKey);

      const result = await service.generateApiKey(dto);

      expect(result.rawKey).toBe('sk_live_testkey123');
      expect(keyRepository.count).toHaveBeenCalledWith({
        where: { appId: dto.appId, isActive: true },
      });
    });

    it('应该在应用不存在时抛出异常', async () => {
      const dto: CreateApiKeyDto = {
        appId: 999,
        name: 'Test Key',
        environment: ApiKeyEnvironment.TEST,
      };

      appRepository.findOne.mockResolvedValue(null);

      await expect(service.generateApiKey(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(keyRepository.save).not.toHaveBeenCalled();
    });

    it('应该在密钥数量达到限制时抛出异常', async () => {
      const dto: CreateApiKeyDto = {
        appId: 1,
        name: 'Test Key',
        environment: ApiKeyEnvironment.TEST,
      };

      const mockApp = createMockApp();
      appRepository.findOne.mockResolvedValue(mockApp);
      keyRepository.count.mockResolvedValue(5); // 已有5个密钥

      await expect(service.generateApiKey(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(keyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    it('应该从缓存返回有效的应用', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp();

      cacheService.get.mockResolvedValue(mockApp);

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual(mockApp);
      expect(cacheService.get).toHaveBeenCalledWith(`api_key:${apiKey}`);
      expect(keyRepository.findOne).not.toHaveBeenCalled();
    });

    it('应该验证数据库中的密钥并缓存结果', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp();
      const mockKey = createMockKey({ app: mockApp });

      cacheService.get.mockResolvedValue(null); // 缓存未命中
      keyRepository.findOne.mockResolvedValue(mockKey);
      cacheService.set.mockResolvedValue(undefined);
      keyRepository.update.mockResolvedValue(undefined as any);

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual(mockApp);
      expect(keyRepository.findOne).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        `api_key:${apiKey}`,
        mockApp,
        300,
      );
      expect(keyRepository.update).toHaveBeenCalled();
    });

    it('应该拒绝过期的密钥', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp();
      const mockKey = createMockKey({
        app: mockApp,
        expiresAt: new Date('2020-01-01'), // 已过期
      });

      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(mockKey);

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('应该拒绝未激活应用的密钥', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp({ isActive: false });
      const mockKey = createMockKey({ app: mockApp });

      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(mockKey);

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('应该拒绝不存在的密钥', async () => {
      const apiKey = 'sk_live_invalidkey';

      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeNull();
    });
  });

  describe('checkRateLimit', () => {
    it('应该允许在限制内的请求', async () => {
      const appId = 1;
      const mockApp = createMockApp({
        rateLimitPerHour: 1000,
        rateLimitPerDay: 10000,
      });

      appRepository.findOne.mockResolvedValue(mockApp);
      cacheService.increment
        .mockResolvedValueOnce(10) // 小时计数
        .mockResolvedValueOnce(100); // 日计数

      const result = await service.checkRateLimit(appId);

      expect(result).toBe(true);
      expect(cacheService.increment).toHaveBeenCalledTimes(2);
    });

    it('应该在超过小时限制时抛出异常', async () => {
      const appId = 1;
      const mockApp = createMockApp({ rateLimitPerHour: 1000 });

      appRepository.findOne.mockResolvedValue(mockApp);
      cacheService.increment
        .mockResolvedValueOnce(1001) // 超过小时限制
        .mockResolvedValueOnce(100);
      cacheService.decrement.mockResolvedValue(1000);

      await expect(service.checkRateLimit(appId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(cacheService.decrement).toHaveBeenCalledTimes(2); // 回滚计数
    });

    it('应该在超过日限制时抛出异常', async () => {
      const appId = 1;
      const mockApp = createMockApp({ rateLimitPerDay: 10000 });

      appRepository.findOne.mockResolvedValue(mockApp);
      cacheService.increment
        .mockResolvedValueOnce(500) // 小时内
        .mockResolvedValueOnce(10001); // 超过日限制
      cacheService.decrement.mockResolvedValue(10000);

      await expect(service.checkRateLimit(appId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(cacheService.decrement).toHaveBeenCalledTimes(1); // 只回滚日计数
    });

    it('应该在应用不存在时返回false', async () => {
      const appId = 999;

      appRepository.findOne.mockResolvedValue(null);

      const result = await service.checkRateLimit(appId);

      expect(result).toBe(false);
      expect(cacheService.increment).not.toHaveBeenCalled();
    });
  });

  describe('recordApiCall', () => {
    it('应该异步记录API调用', async () => {
      const appId = 1;
      const details = {
        method: 'GET',
        endpoint: '/api/users',
        statusCode: 200,
        responseTime: 100,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const mockLog = new ApiCallLogEntity();
      logRepository.create.mockReturnValue(mockLog);
      logRepository.save.mockResolvedValue(mockLog);
      appRepository.update.mockResolvedValue(undefined as any);

      await service.recordApiCall(appId, details);

      expect(logRepository.create).toHaveBeenCalledWith({
        appId,
        ...details,
      });
      // save是异步的，可能不会立即完成，但应该被调用
    });
  });

  describe('revokeApiKey', () => {
    it('应该成功撤销API密钥', async () => {
      const keyId = 1;
      const mockKey = createMockKey({ rawKey: 'sk_live_testkey' });

      keyRepository.update.mockResolvedValue(undefined as any);
      keyRepository.findOne.mockResolvedValue(mockKey);
      cacheService.del.mockResolvedValue(undefined);

      await service.revokeApiKey(keyId);

      expect(keyRepository.update).toHaveBeenCalledWith(keyId, {
        isActive: false,
      });
      expect(cacheService.del).toHaveBeenCalled();
    });
  });

  describe('getAppKeys', () => {
    it('应该返回应用的所有密钥', async () => {
      const appId = 1;
      const mockKeys = [createMockKey(), createMockKey({ id: 2 })];

      keyRepository.find.mockResolvedValue(mockKeys);

      const result = await service.getAppKeys(appId);

      expect(result).toEqual(mockKeys);
      expect(keyRepository.find).toHaveBeenCalledWith({
        where: { appId },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
