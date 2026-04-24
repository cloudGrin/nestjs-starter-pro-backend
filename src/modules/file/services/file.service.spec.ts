import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileService } from './file.service';
import { FileRepository } from '../repositories/file.repository';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { FileStorageFactory } from '../storage/storage.factory';
import { FileEntity, FileStatus, FileStorageType } from '../entities/file.entity';
import { BusinessException } from '~/common/exceptions/business.exception';

describe('FileService', () => {
  let service: FileService;
  let repository: jest.Mocked<FileRepository>;
  let configService: jest.Mocked<ConfigService>;
  let storageFactory: jest.Mocked<FileStorageFactory>;
  let cache: jest.Mocked<CacheService>;
  let logger: jest.Mocked<LoggerService>;

  // Mock文件对象
  const createMockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100, // 100KB
    buffer: Buffer.from('test image data'),
    destination: '',
    filename: 'test.jpg',
    path: '',
    stream: undefined as any,
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      createAndSave: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findByIdOrFail: jest.fn(),
      paginateFiles: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'file.storage': FileStorageType.LOCAL,
          'file.uploadDir': 'uploads',
          'file.maxSize': 50 * 1024 * 1024,
          'file.allowedTypes': ['.jpg', '.jpeg', '.png', '.pdf', '.txt'],
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockStorageStrategy = {
      saveFile: jest.fn().mockResolvedValue({
        filename: 'test_123.jpg',
        path: 'uploads/2024/01/20/test_123.jpg',
        url: '/files/uploads/2024/01/20/test_123.jpg',
        size: 1024 * 100,
        metadata: {},
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      getStream: jest.fn().mockReturnValue({} as any),
    };

    const mockStorageFactory = {
      getStrategy: jest.fn().mockReturnValue(mockStorageStrategy),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: FileRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FileStorageFactory, useValue: mockStorageFactory },
        { provide: CacheService, useValue: mockCache },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    repository = module.get(FileRepository);
    configService = module.get(ConfigService);
    storageFactory = module.get(FileStorageFactory);
    cache = module.get(CacheService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('配置和初始化', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
      expect(logger.setContext).toHaveBeenCalledWith('FileService');
    });
  });

  describe('upload', () => {
    it('应该成功上传文件', async () => {
      const file = createMockFile();
      const uploadDto = {
        module: 'avatar',
        isPublic: true,
      };

      const createdEntity = {
        id: 1,
        originalName: 'test.jpg',
        filename: 'test_123.jpg',
        path: 'uploads/2024/01/20/test_123.jpg',
        status: FileStatus.AVAILABLE,
      } as FileEntity;

      repository.createAndSave.mockResolvedValue(createdEntity);

      const result = await service.upload(file, uploadDto, 1);

      expect(result).toBeDefined();
      expect(repository.createAndSave).toHaveBeenCalled();
    });

    it('当没有提供文件时应该抛出异常', async () => {
      await expect(service.upload(null as any, {}, 1)).rejects.toThrow(BusinessException);
    });

    it('当文件大小超出限制时应该抛出异常', async () => {
      const largeFile = createMockFile({
        size: 100 * 1024 * 1024, // 100MB，超过50MB限制
      });

      await expect(service.upload(largeFile, {}, 1)).rejects.toThrow(BusinessException);
    });

    it('当文件类型不允许时应该抛出异常', async () => {
      const unsupportedFile = createMockFile({
        originalname: 'malicious.exe',
        mimetype: 'application/x-msdownload',
      });

      await expect(service.upload(unsupportedFile, {}, 1)).rejects.toThrow(BusinessException);
    });

    it('应该拒绝危险的文件扩展名', async () => {
      const dangerousFiles = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar'];

      for (const ext of dangerousFiles) {
        const file = createMockFile({
          originalname: `test${ext}`,
          mimetype: 'application/octet-stream',
        });

        await expect(service.upload(file, {}, 1)).rejects.toThrow(BusinessException);
      }
    });
  });

  describe('findFiles', () => {
    it('应该成功查询文件列表', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      };

      repository.paginateFiles.mockResolvedValue(mockResult);

      const result = await service.findFiles(query);

      expect(result).toEqual(mockResult);
      expect(repository.paginateFiles).toHaveBeenCalled();
    });

    it('应该支持按模块过滤', async () => {
      const query = {
        module: 'avatar',
        page: 1,
        limit: 10,
      };

      repository.paginateFiles.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findFiles(query);

      expect(repository.paginateFiles).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ module: 'avatar' }),
      );
    });
  });

  describe('findById', () => {
    it('应该成功查询文件详情', async () => {
      const mockFile = {
        id: 1,
        originalName: 'test.jpg',
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);

      const result = await service.findById(1);

      expect(result).toEqual(mockFile);
      expect(repository.findByIdOrFail).toHaveBeenCalledWith(1);
    });
  });

  describe('remove', () => {
    it('应该成功删除文件', async () => {
      const mockFile = {
        id: 1,
        path: 'uploads/test.jpg',
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);

      await service.remove(1);

      const strategy = storageFactory.getStrategy(FileStorageType.LOCAL);
      expect(strategy.delete).toHaveBeenCalledWith(mockFile.path);
      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(cache.del).toHaveBeenCalledWith('file:id:1');
    });

  });

  describe('完整流程测试', () => {
    it('上传->查询->删除流程', async () => {
      // 1. 上传文件
      const file = createMockFile();
      const uploadDto = { module: 'test', isPublic: true };
      const createdFile = {
        id: 1,
        originalName: 'test.jpg',
        path: 'uploads/test.jpg',
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.createAndSave.mockResolvedValue(createdFile);

      const uploaded = await service.upload(file, uploadDto, 1);
      expect(uploaded.id).toBe(1);

      // 2. 查询文件
      repository.findByIdOrFail.mockResolvedValue(createdFile);
      const found = await service.findById(1);
      expect(found.id).toBe(1);

      // 3. 删除文件
      await service.remove(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
      expect(cache.del).toHaveBeenCalledWith('file:id:1');
    });
  });
});
