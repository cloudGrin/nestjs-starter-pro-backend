import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  let eventEmitter: jest.Mocked<EventEmitter2>;

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
          'file.tempDir': 'uploads/temp',
          'file.maxSize': 50 * 1024 * 1024,
          'file.allowedTypes': ['.jpg', '.jpeg', '.png', '.pdf', '.txt'],
          'file.chunk.defaultSize': 5 * 1024 * 1024,
          'file.chunk.expire': 24 * 60 * 60,
          'file.image.compress': true,
          'file.image.quality': 80,
          'file.image.maxWidth': 1920,
          'file.image.thumbnail.enable': false, // 测试中禁用缩略图避免sharp依赖
          'file.image.thumbnail.width': 320,
          'file.image.thumbnail.height': 320,
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
      generateSignedUrl: jest.fn().mockResolvedValue('https://example.com/signed-url'),
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

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: FileRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FileStorageFactory, useValue: mockStorageFactory },
        { provide: CacheService, useValue: mockCache },
        { provide: LoggerService, useValue: mockLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    repository = module.get(FileRepository);
    configService = module.get(ConfigService);
    storageFactory = module.get(FileStorageFactory);
    cache = module.get(CacheService);
    logger = module.get(LoggerService);
    eventEmitter = module.get(EventEmitter2);
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
      expect(eventEmitter.emit).toHaveBeenCalledWith('file.uploaded', { file: createdEntity });
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
      const dangerousFiles = [
        '.exe',
        '.bat',
        '.cmd',
        '.sh',
        '.ps1',
        '.vbs',
        '.js',
        '.jar',
      ];

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
      // Mock BaseService.remove method
      const baseRemoveSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'remove');
      baseRemoveSpy.mockResolvedValue(undefined);

      await service.remove(1);

      const strategy = storageFactory.getStrategy(FileStorageType.LOCAL);
      expect(strategy.delete).toHaveBeenCalledWith(mockFile.path);
      expect(cache.del).toHaveBeenCalledWith('file:id:1');

      baseRemoveSpy.mockRestore();
    });

    it('应该同时删除缩略图', async () => {
      const mockFile = {
        id: 1,
        path: 'uploads/test.jpg',
        thumbnailPath: 'uploads/thumbnails/test_thumb.jpg',
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);
      const baseRemoveSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'remove');
      baseRemoveSpy.mockResolvedValue(undefined);

      await service.remove(1);

      const strategy = storageFactory.getStrategy(FileStorageType.LOCAL);
      expect(strategy.delete).toHaveBeenCalledWith(mockFile.path);
      expect(strategy.delete).toHaveBeenCalledWith(mockFile.thumbnailPath);

      baseRemoveSpy.mockRestore();
    });
  });

  describe('generateDownloadUrl', () => {
    it('应该为文件所有者生成下载URL', async () => {
      const mockFile = {
        id: 1,
        path: 'uploads/test.jpg',
        originalName: 'test.jpg',
        uploaderId: 1,
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);

      const url = await service.generateDownloadUrl(1, 1, 3600, false);

      expect(url).toBe('https://example.com/signed-url');
      const strategy = storageFactory.getStrategy(FileStorageType.LOCAL);
      expect(strategy.generateSignedUrl).toHaveBeenCalledWith(
        mockFile.path,
        3600,
        mockFile.originalName,
      );
    });

    it('应该允许管理员访问任何文件', async () => {
      const mockFile = {
        id: 1,
        path: 'uploads/test.jpg',
        originalName: 'test.jpg',
        uploaderId: 2, // 不同的用户
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);

      const url = await service.generateDownloadUrl(1, 1, 3600, true);

      expect(url).toBeTruthy();
    });

    it('应该拒绝非所有者访问私有文件', async () => {
      const mockFile = {
        id: 1,
        path: 'uploads/test.jpg',
        originalName: 'test.jpg',
        uploaderId: 2, // 不同的用户
        storage: FileStorageType.LOCAL,
      } as FileEntity;

      repository.findByIdOrFail.mockResolvedValue(mockFile);

      await expect(service.generateDownloadUrl(1, 1, 3600, false)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('getUploadProgress', () => {
    it('应该返回上传进度', async () => {
      const mockProgress = {
        uploadId: 'test-upload-id',
        filename: 'large-file.zip',
        totalChunks: 10,
        uploadedChunks: 5,
        uploadedSize: 5 * 1024 * 1024,
        totalSize: 10 * 1024 * 1024,
        status: FileStatus.UPLOADING,
      };

      cache.get.mockResolvedValue(mockProgress);

      const result = await service.getUploadProgress('test-upload-id');

      expect(result).toEqual(mockProgress);
      expect(cache.get).toHaveBeenCalledWith('upload:progress:test-upload-id');
    });

    it('当uploadId为空时应该返回null', async () => {
      const result = await service.getUploadProgress('');

      expect(result).toBeNull();
      expect(cache.get).not.toHaveBeenCalled();
    });

    it('当进度不存在时应该返回null', async () => {
      cache.get.mockResolvedValue(null);

      const result = await service.getUploadProgress('non-existent');

      expect(result).toBeNull();
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
      const baseRemoveSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(service)), 'remove');
      baseRemoveSpy.mockResolvedValue(undefined);

      await service.remove(1);
      expect(cache.del).toHaveBeenCalledWith('file:id:1');

      baseRemoveSpy.mockRestore();
    });
  });
});
