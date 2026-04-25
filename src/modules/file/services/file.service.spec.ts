import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileService } from './file.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { FileStorageFactory } from '../storage/storage.factory';
import { FileEntity, FileStorageType } from '../entities/file.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { createMockRepository, createMockConfigService, createMockLogger } from '~/test-utils';

describe('FileService', () => {
  let service: FileService;
  let repository: jest.Mocked<Repository<FileEntity>>;
  let storageFactory: jest.Mocked<FileStorageFactory>;
  let logger: jest.Mocked<LoggerService>;

  const createMockFile = (overrides?: Partial<Express.Multer.File>): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100,
    buffer: Buffer.from('test image data'),
    destination: '',
    filename: 'test.jpg',
    path: '',
    stream: undefined as any,
    ...overrides,
  });

  beforeEach(async () => {
    const mockRepository = createMockRepository<FileEntity>();
    const mockConfigService = createMockConfigService({
      file: {
        storage: FileStorageType.LOCAL,
        uploadDir: 'uploads',
        maxSize: 50 * 1024 * 1024,
        allowedTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.txt'],
      },
    });
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
    } as unknown as jest.Mocked<FileStorageFactory>;
    const mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: getRepositoryToken(FileEntity), useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FileStorageFactory, useValue: mockStorageFactory },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(FileService);
    repository = module.get(getRepositoryToken(FileEntity));
    storageFactory = module.get(FileStorageFactory);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith('FileService');
  });

  describe('upload', () => {
    it('应该成功上传文件', async () => {
      const file = createMockFile();
      const entity = { id: 1, originalName: file.originalname } as FileEntity;
      repository.create.mockReturnValue(entity);
      repository.save.mockResolvedValue(entity);

      const result = await service.upload(file, { module: 'avatar', isPublic: true }, 1);

      expect(result).toEqual(entity);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.create.mock.calls[0][0]).not.toHaveProperty('status');
      expect(repository.save).toHaveBeenCalledWith(entity);
    });

    it('当没有提供文件时应该抛出异常', async () => {
      await expect(service.upload(null as any, {}, 1)).rejects.toThrow(BusinessException);
    });

    it('当文件类型不允许时应该抛出异常', async () => {
      await expect(
        service.upload(
          createMockFile({
            originalname: 'malicious.exe',
            mimetype: 'application/x-msdownload',
          }),
          {},
          1,
        ),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('findFiles', () => {
    it('应该成功分页查询文件', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findFiles({ page: 1, limit: 10 });

      expect(result.meta.currentPage).toBe(1);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('file');
    });

    it('ignores unsupported sort fields and falls back to createdAt ordering', async () => {
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findFiles({ page: 1, limit: 10, sort: 'id;DROP TABLE files' } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('file.createdAt', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith('file.id;DROP TABLE files', expect.anything());
    });
  });

  describe('findById', () => {
    it('应该成功查询文件详情', async () => {
      const file = { id: 1, originalName: 'test.jpg' } as FileEntity;
      repository.findOne.mockResolvedValue(file);

      const result = await service.findById(1);

      expect(result).toEqual(file);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('remove', () => {
    it('应该成功删除文件', async () => {
      const file = {
        id: 1,
        path: 'uploads/test.jpg',
        storage: FileStorageType.LOCAL,
      } as FileEntity;
      repository.findOne.mockResolvedValue(file);
      repository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(1);

      expect(storageFactory.getStrategy(FileStorageType.LOCAL).delete).toHaveBeenCalledWith(
        file.path,
      );
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });
});
