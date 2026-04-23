import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApiAuthService } from './api-auth.service';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { ApiAppRepository } from '../repositories/api-app.repository';
import { ApiKeyRepository } from '../repositories/api-key.repository';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto, ApiKeyEnvironment } from '../dto/create-api-key.dto';

describe('ApiAuthService', () => {
  let service: ApiAuthService;
  let appRepository: jest.Mocked<ApiAppRepository>;
  let keyRepository: jest.Mocked<ApiKeyRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const createMockApp = (overrides?: Partial<ApiAppEntity>): ApiAppEntity => {
    const app = new ApiAppEntity();
    app.id = 1;
    app.name = 'Test App';
    app.description = 'Test Description';
    app.scopes = ['read:users', 'read:orders'];
    app.isActive = true;
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
      findById: jest.fn(),
      isNameExist: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };

    const mockKeyRepository = {
      findById: jest.fn(),
      findByAppId: jest.fn(),
      findActiveKeysByAppId: jest.fn(),
      findByKeyHash: jest.fn(),
      updateUsageStats: jest.fn(),
      revokeKey: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiAuthService,
        { provide: ApiAppRepository, useValue: mockAppRepository },
        { provide: ApiKeyRepository, useValue: mockKeyRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ApiAuthService>(ApiAuthService);
    appRepository = module.get(ApiAppRepository);
    keyRepository = module.get(ApiKeyRepository);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApp', () => {
    it('creates API app', async () => {
      const dto: CreateApiAppDto = {
        name: 'New App',
        description: 'Test App',
        scopes: ['read:users'],
      };
      const mockApp = createMockApp({ name: dto.name });

      appRepository.isNameExist.mockResolvedValue(false);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await service.createApp(dto);

      expect(result).toEqual(mockApp);
      expect(appRepository.isNameExist).toHaveBeenCalledWith(dto.name);
      expect(appRepository.save).toHaveBeenCalledWith(mockApp);
    });

    it('rejects duplicate app name', async () => {
      appRepository.isNameExist.mockResolvedValue(true);

      await expect(service.createApp({ name: 'Existing App' })).rejects.toThrow(
        BadRequestException,
      );
      expect(appRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('generateApiKey', () => {
    it('generates API key once', async () => {
      const dto: CreateApiKeyDto = {
        appId: 1,
        name: 'Production Key',
        environment: ApiKeyEnvironment.PRODUCTION,
      };
      const mockKey = createMockKey({ rawKey: 'sk_live_testkey123' });

      appRepository.findById.mockResolvedValue(createMockApp());
      keyRepository.findActiveKeysByAppId.mockResolvedValue([
        createMockKey(),
        createMockKey({ id: 2 }),
      ]);
      keyRepository.create.mockReturnValue(mockKey);
      keyRepository.save.mockResolvedValue(mockKey);

      const result = await service.generateApiKey(dto);

      expect(result.rawKey).toBe('sk_live_testkey123');
      expect(keyRepository.findActiveKeysByAppId).toHaveBeenCalledWith(dto.appId);
    });

    it('rejects missing or inactive app', async () => {
      appRepository.findById.mockResolvedValue(null);

      await expect(
        service.generateApiKey({
          appId: 999,
          name: 'Test Key',
          environment: ApiKeyEnvironment.TEST,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(keyRepository.save).not.toHaveBeenCalled();
    });

    it('limits active keys per app', async () => {
      appRepository.findById.mockResolvedValue(createMockApp());
      keyRepository.findActiveKeysByAppId.mockResolvedValue([
        createMockKey({ id: 1 }),
        createMockKey({ id: 2 }),
        createMockKey({ id: 3 }),
        createMockKey({ id: 4 }),
        createMockKey({ id: 5 }),
      ]);

      await expect(
        service.generateApiKey({
          appId: 1,
          name: 'Test Key',
          environment: ApiKeyEnvironment.TEST,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(keyRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteApp', () => {
    it('disables app and revokes related keys', async () => {
      const keys = [createMockKey({ id: 11 }), createMockKey({ id: 12 })];

      appRepository.findById.mockResolvedValue(createMockApp({ id: 1, isActive: true }));
      appRepository.update.mockResolvedValue({ ...createMockApp(), isActive: false });
      keyRepository.findByAppId.mockResolvedValue(keys);
      keyRepository.revokeKey.mockResolvedValue(undefined);

      await service.deleteApp(1);

      expect(appRepository.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(keyRepository.revokeKey).toHaveBeenCalledTimes(2);
      expect(cacheService.del).toHaveBeenCalledWith('api_key:mock-hash');
    });
  });

  describe('validateApiKey', () => {
    it('returns cached app', async () => {
      const apiKey = 'sk_live_testkey123';
      const cachedAuth = {
        id: 1,
        name: 'Test App',
        scopes: ['read:users'],
        type: 'api-app' as const,
      };
      const keyHash = ApiKeyEntity.hashKey(apiKey);

      cacheService.get.mockResolvedValue(cachedAuth);

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual(cachedAuth);
      expect(cacheService.get).toHaveBeenCalledWith(`api_key:${keyHash}`);
      expect(keyRepository.findByKeyHash).not.toHaveBeenCalled();
    });

    it('validates database key and prefers key scopes over app scopes', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp({ scopes: ['read:users', 'write:orders'] });
      const mockKey = createMockKey({ app: mockApp, scopes: ['read:users'] });
      const keyHash = ApiKeyEntity.hashKey(apiKey);

      cacheService.get.mockResolvedValue(null);
      keyRepository.findByKeyHash.mockResolvedValue(mockKey);
      cacheService.set.mockResolvedValue(undefined);
      keyRepository.updateUsageStats.mockResolvedValue(undefined);

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual({
        id: mockApp.id,
        name: mockApp.name,
        ownerId: mockApp.ownerId,
        scopes: ['read:users'],
        type: 'api-app',
      });
      expect(keyRepository.findByKeyHash).toHaveBeenCalledWith(keyHash);
      expect(cacheService.set).toHaveBeenCalledWith(
        `api_key:${keyHash}`,
        {
          id: mockApp.id,
          name: mockApp.name,
          ownerId: mockApp.ownerId,
          scopes: ['read:users'],
          type: 'api-app',
        },
        300,
      );
      expect(keyRepository.updateUsageStats).toHaveBeenCalledWith(mockKey.id);
    });

    it('rejects expired key', async () => {
      cacheService.get.mockResolvedValue(null);
      keyRepository.findByKeyHash.mockResolvedValue(
        createMockKey({
          app: createMockApp(),
          expiresAt: new Date('2020-01-01'),
        }),
      );

      await expect(service.validateApiKey('sk_live_testkey123')).resolves.toBeNull();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('rejects inactive app', async () => {
      cacheService.get.mockResolvedValue(null);
      keyRepository.findByKeyHash.mockResolvedValue(
        createMockKey({ app: createMockApp({ isActive: false }) }),
      );

      await expect(service.validateApiKey('sk_live_testkey123')).resolves.toBeNull();
    });

    it('rejects missing key', async () => {
      cacheService.get.mockResolvedValue(null);
      keyRepository.findByKeyHash.mockResolvedValue(null);

      await expect(service.validateApiKey('sk_live_invalidkey')).resolves.toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('revokes API key and clears cache', async () => {
      const mockKey = createMockKey({ keyHash: 'hashed-key' });

      keyRepository.findById.mockResolvedValue(mockKey);
      keyRepository.revokeKey.mockResolvedValue(undefined);
      cacheService.del.mockResolvedValue(undefined);

      await service.revokeApiKey(1);

      expect(keyRepository.revokeKey).toHaveBeenCalledWith(1);
      expect(cacheService.del).toHaveBeenCalledWith(`api_key:${mockKey.keyHash}`);
    });
  });

  describe('getAppKeys', () => {
    it('returns all keys for app', async () => {
      const mockKeys = [createMockKey(), createMockKey({ id: 2 })];

      keyRepository.findByAppId.mockResolvedValue(mockKeys);

      await expect(service.getAppKeys(1)).resolves.toEqual(mockKeys);
      expect(keyRepository.findByAppId).toHaveBeenCalledWith(1);
    });
  });
});
