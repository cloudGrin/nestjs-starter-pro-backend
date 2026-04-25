import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiAuthService } from './api-auth.service';
import { ApiAppEntity } from '../entities/api-app.entity';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { CacheService } from '~/shared/cache/cache.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto, ApiKeyEnvironment } from '../dto/create-api-key.dto';

describe('ApiAuthService', () => {
  let service: ApiAuthService;
  let appRepository: any;
  let keyRepository: any;
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
      count: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockKeyRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      increment: jest.fn(),
      update: jest.fn(),
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
        { provide: getRepositoryToken(ApiAppEntity), useValue: mockAppRepository },
        { provide: getRepositoryToken(ApiKeyEntity), useValue: mockKeyRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ApiAuthService>(ApiAuthService);
    appRepository = module.get(getRepositoryToken(ApiAppEntity));
    keyRepository = module.get(getRepositoryToken(ApiKeyEntity));
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getApps', () => {
    it('uses query pagination inside the service', async () => {
      const apps = [createMockApp({ id: 1 }), createMockApp({ id: 2 })];
      appRepository.findAndCount.mockResolvedValue([apps, 12]);

      await expect(service.getApps({ page: 2, limit: 5 })).resolves.toEqual({
        items: apps,
        meta: {
          totalItems: 12,
          itemCount: 2,
          itemsPerPage: 5,
          totalPages: 3,
          currentPage: 2,
        },
      });
      expect(appRepository.findAndCount).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('createApp', () => {
    it('creates API app', async () => {
      const dto: CreateApiAppDto = {
        name: 'New App',
        description: 'Test App',
        scopes: ['read:users'],
      };
      const mockApp = createMockApp({ name: dto.name });

      appRepository.count.mockResolvedValue(0);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      const result = await service.createApp(dto);

      expect(result).toEqual(mockApp);
      expect(appRepository.count).toHaveBeenCalledWith({ where: { name: dto.name } });
      expect(appRepository.save).toHaveBeenCalledWith(mockApp);
    });

    it('sets owner id when provided by the authenticated user context', async () => {
      const dto: CreateApiAppDto = {
        name: 'Owned App',
        scopes: ['read:users'],
      };
      const mockApp = createMockApp({ name: dto.name, ownerId: 7 });

      appRepository.count.mockResolvedValue(0);
      appRepository.create.mockReturnValue(mockApp);
      appRepository.save.mockResolvedValue(mockApp);

      await expect(service.createApp(dto, 7)).resolves.toEqual(mockApp);
      expect(appRepository.create).toHaveBeenCalledWith({
        ...dto,
        ownerId: 7,
      });
    });

    it('rejects duplicate app name', async () => {
      appRepository.count.mockResolvedValue(1);

      await expect(service.createApp({ name: 'Existing App' })).rejects.toThrow(
        BadRequestException,
      );
      expect(appRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateApp', () => {
    it('clears cached API key auth when app scopes or active status changes', async () => {
      const keys = [
        createMockKey({ id: 11, keyHash: 'hash-11' }),
        createMockKey({ id: 12, keyHash: 'hash-12' }),
      ];
      const app = createMockApp({ id: 1, scopes: ['read:users'], isActive: true });

      appRepository.findOne.mockResolvedValue(app);
      appRepository.save.mockResolvedValue({
        ...app,
        scopes: ['read:users', 'write:users'],
      });
      keyRepository.find.mockResolvedValue(keys);

      await service.updateApp(1, { scopes: ['read:users', 'write:users'] });

      expect(keyRepository.find).toHaveBeenCalledWith({
        where: { appId: 1 },
        order: { createdAt: 'DESC' },
      });
      expect(cacheService.del).toHaveBeenCalledWith('api_key:hash-11');
      expect(cacheService.del).toHaveBeenCalledWith('api_key:hash-12');
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

      appRepository.findOne.mockResolvedValue(createMockApp());
      keyRepository.find.mockResolvedValue([createMockKey(), createMockKey({ id: 2 })]);
      keyRepository.create.mockReturnValue(mockKey);
      keyRepository.save.mockResolvedValue(mockKey);

      const result = await service.generateApiKey(dto);

      expect(result.rawKey).toBe('sk_live_testkey123');
      expect(keyRepository.find).toHaveBeenCalledWith({
        where: { appId: dto.appId, isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('rejects missing or inactive app', async () => {
      appRepository.findOne.mockResolvedValue(null);

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
      appRepository.findOne.mockResolvedValue(createMockApp());
      keyRepository.find.mockResolvedValue([
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

      appRepository.findOne.mockResolvedValue(createMockApp({ id: 1, isActive: true }));
      appRepository.update.mockResolvedValue(undefined);
      keyRepository.find.mockResolvedValue(keys);
      keyRepository.update.mockResolvedValue(undefined);

      await service.deleteApp(1);

      expect(appRepository.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(keyRepository.update).toHaveBeenCalledTimes(2);
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
      expect(keyRepository.findOne).not.toHaveBeenCalled();
    });

    it('validates database key and prefers key scopes over app scopes', async () => {
      const apiKey = 'sk_live_testkey123';
      const mockApp = createMockApp({ scopes: ['read:users', 'write:orders'] });
      const mockKey = createMockKey({ app: mockApp, scopes: ['read:users'] });
      const keyHash = ApiKeyEntity.hashKey(apiKey);

      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(mockKey);
      cacheService.set.mockResolvedValue(undefined);
      keyRepository.increment.mockResolvedValue(undefined);
      keyRepository.update.mockResolvedValue(undefined);

      const result = await service.validateApiKey(apiKey);

      expect(result).toEqual({
        id: mockApp.id,
        name: mockApp.name,
        ownerId: mockApp.ownerId,
        scopes: ['read:users'],
        type: 'api-app',
      });
      expect(keyRepository.findOne).toHaveBeenCalledWith({
        where: { keyHash },
        relations: ['app'],
      });
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
      expect(keyRepository.increment).toHaveBeenCalledWith({ id: mockKey.id }, 'usageCount', 1);
    });

    it('rejects expired key', async () => {
      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(
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
      keyRepository.findOne.mockResolvedValue(
        createMockKey({ app: createMockApp({ isActive: false }) }),
      );

      await expect(service.validateApiKey('sk_live_testkey123')).resolves.toBeNull();
    });

    it('rejects missing key', async () => {
      cacheService.get.mockResolvedValue(null);
      keyRepository.findOne.mockResolvedValue(null);

      await expect(service.validateApiKey('sk_live_invalidkey')).resolves.toBeNull();
    });
  });

  describe('revokeApiKey', () => {
    it('revokes API key and clears cache', async () => {
      const mockKey = createMockKey({ keyHash: 'hashed-key' });

      keyRepository.findOne.mockResolvedValue(mockKey);
      keyRepository.update.mockResolvedValue(undefined);
      cacheService.del.mockResolvedValue(undefined);

      await service.revokeApiKey(1);

      expect(keyRepository.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(cacheService.del).toHaveBeenCalledWith(`api_key:${mockKey.keyHash}`);
    });
  });

  describe('getAppKeys', () => {
    it('returns all keys for app', async () => {
      const mockKeys = [createMockKey(), createMockKey({ id: 2 })];

      keyRepository.find.mockResolvedValue(mockKeys);

      await expect(service.getAppKeys(1)).resolves.toEqual(mockKeys);
      expect(keyRepository.find).toHaveBeenCalledWith({
        where: { appId: 1 },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
