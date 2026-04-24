import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fsPromises } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import dayjs from 'dayjs';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import { FileUtil } from '~/common/utils';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';
import { FileEntity, FileStatus, FileStorageType } from '../entities/file.entity';
import { UploadFileDto } from '../dto/upload-file.dto';
import { QueryFileDto } from '../dto/query-file.dto';
import { FileStorageFactory } from '../storage/storage.factory';
import { FileStorageStrategy } from '../storage/file-storage.interface';

interface UserWithRoles {
  id: number;
  roles?: Array<{ code: string } | string>;
}

interface FileQueryOptions {
  keyword?: string;
  storage?: FileStorageType;
  status?: FileStatus;
  category?: string;
  module?: string;
  isPublic?: boolean;
}

@Injectable()
export class FileService {
  private readonly storageType: FileStorageType;
  private readonly uploadRoot: string;
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService,
    private readonly storageFactory: FileStorageFactory,
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(FileService.name);

    this.storageType = this.configService.get<FileStorageType>(
      'file.storage',
      FileStorageType.LOCAL,
    );
    this.uploadRoot = this.resolvePath(this.configService.get<string>('file.uploadDir', 'uploads'));
    this.maxFileSize = this.getNumber('file.maxSize', 50 * 1024 * 1024);
    this.allowedTypes = this.normalizeAllowedTypes(
      this.configService.get<string | string[]>('file.allowedTypes', [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
        '.pdf',
        '.doc',
        '.docx',
        '.ppt',
        '.pptx',
        '.txt',
        '.zip',
      ]),
    );

    this.ensureDirectories().catch((error) => {
      this.logger?.error('初始化文件目录失败', error.stack);
    });
  }

  /**
   * 直接上传文件
   */
  async upload(
    file: Express.Multer.File,
    options: UploadFileDto,
    uploaderId?: number,
  ): Promise<FileEntity> {
    if (!file) {
      throw BusinessException.validationFailed('请选择要上传的文件');
    }

    this.validateFile(file);
    this.logger?.debug(
      `[FileUpload] Receive file "${file.originalname}" (${FileUtil.formatSize(file.size)})`,
    );

    const storage = this.getStorageStrategy();
    const relativePath = this.buildRelativePath(options.module);
    const uniqueFilename = FileUtil.generateUniqueFilename(file.originalname);

    const category = FileUtil.getFileCategory(file.originalname);
    const hash = this.computeHash(file.buffer!);

    const stored = await storage.saveFile(file.buffer!, {
      filename: uniqueFilename,
      relativePath,
      isPublic: options.isPublic ?? false,
    });
    this.logger?.log(
      `[FileUpload] Stored file "${stored.filename}" via ${this.storageType} (path=${stored.path})`,
    );

    const entity = await this.fileRepository.save(
      this.fileRepository.create({
      originalName: file.originalname,
      filename: stored.filename,
      path: stored.path,
      url: stored.url,
      mimeType: file.mimetype,
      size: stored.size,
      category,
      storage: this.storageType,
      hash,
      module: options.module,
      tags: options.tags,
      isPublic: options.isPublic ?? false,
      remark: options.remark,
      status: FileStatus.AVAILABLE,
      metadata: stored.metadata,
      uploaderId,
      }),
    );

    await this.clearFileCache();

    return entity;
  }

  /**
   * 查询文件列表
   */
  async findFiles(query: QueryFileDto) {
    const filters: FileQueryOptions = {
      keyword: query.keyword,
      storage: query.storage,
      status: query.status,
      category: query.category,
      module: query.module,
      isPublic: query.isPublic,
    };

    const paginationOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };

    return this.paginateFiles(paginationOptions, filters);
  }

  /**
   * 根据ID查询文件
   */
  async findById(id: number): Promise<FileEntity> {
    return this.findByIdOrFail(id);
  }

  /**
   * 检查文件下载权限
   * @param file 文件实体
   * @param user 当前用户
   * @throws ForbiddenException 无权限时抛出异常
   */
  checkDownloadPermission(file: FileEntity, user: UserWithRoles): void {
    // 如果文件是公开的，任何人都可以下载
    if (file.isPublic) {
      return;
    }

    // 检查是否是文件上传者
    const isOwner = file.uploaderId === user.id;
    if (isOwner) {
      return;
    }

    // 检查是否有管理员权限
    const hasAdminPermission = user.roles?.some(
      (role) => {
        const code = typeof role === 'string' ? role : role.code;
        return code === 'admin' || code === 'super_admin';
      },
    );

    if (!hasAdminPermission) {
      throw BusinessException.forbidden('无权下载此文件');
    }
  }

  /**
   * 删除文件（包含物理删除）
   */
  async remove(id: number): Promise<void> {
    const entity = await this.findById(id); // 使用带缓存的查询方法
    const storage = this.getStorageStrategy(entity.storage);

    if (entity.path) {
      await storage.delete(entity.path);
    }

    const deleteResult = await this.fileRepository.delete(id);
    if (!deleteResult.affected) {
      throw BusinessException.notFound('File', id);
    }
    await this.clearFileCache(id);
  }

  /**
   * 获取文件下载流
   */
  async getDownloadStream(id: number): Promise<NodeJS.ReadableStream> {
    const entity = await this.findById(id); // 使用带缓存的查询方法
    const storage = this.getStorageStrategy(entity.storage);

    return storage.getStream(entity.path);
  }

  /**
   * 构建相对路径
   */
  private buildRelativePath(module?: string): string {
    const segments = [dayjs().format('YYYY/MM/DD')];
    if (module) {
      segments.unshift(module.replace(/[^a-zA-Z0-9/_-]/g, ''));
    }
    return segments.join('/');
  }

  /**
   * 计算哈希
   */
  private computeHash(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 验证文件合法性
   */
  private validateFile(file: Express.Multer.File): void {
    // 1. 验证文件大小
    if (!FileUtil.validateFileSize(file.size, this.maxFileSize)) {
      throw BusinessException.validationFailed(
        `文件大小超出限制（最大 ${FileUtil.formatSize(this.maxFileSize)}）`,
      );
    }

    // 2. 验证文件扩展名
    if (!FileUtil.validateFileType(file.originalname, this.allowedTypes)) {
      throw BusinessException.validationFailed(
        `不支持的文件类型，仅允许：${this.allowedTypes.join(', ')}`,
      );
    }

    // 3. 验证MIME类型
    if (file.mimetype) {
      const allowedMimeTypes = this.getAllowedMimeTypes();
      if (!allowedMimeTypes.includes(file.mimetype)) {
        this.logger?.warn(
          `Rejected file with MIME type "${file.mimetype}" for "${file.originalname}"`,
        );
        throw BusinessException.validationFailed(`文件MIME类型不匹配: ${file.mimetype}`);
      }
    }

    // 4. 对于可执行文件和脚本文件，做额外检查
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar'];
    const ext = FileUtil.getExtension(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      throw BusinessException.validationFailed(`出于安全考虑，不允许上传 ${ext} 文件`);
    }
  }

  /**
   * 获取允许的MIME类型列表
   */
  private getAllowedMimeTypes(): string[] {
    return [
      // 图片
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // 文档
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // 文本
      'text/plain',
      // 压缩文件
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      // 其他常见类型
      'application/octet-stream', // 通用二进制流（需要结合扩展名验证）
    ];
  }

  /**
   * 获取存储策略
   */
  private getStorageStrategy(storage?: FileStorageType): FileStorageStrategy {
    return this.storageFactory.getStrategy(storage || this.storageType);
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    await fsPromises.mkdir(this.uploadRoot, { recursive: true });
  }

  /**
   * 解析允许的文件类型
   */
  private normalizeAllowedTypes(types: string | string[]): string[] {
    if (Array.isArray(types)) {
      return types.map((item) => item.trim()).filter(Boolean);
    }
    return types
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  /**
   * 解析路径
   */
  private resolvePath(target: string): string {
    return resolve(process.cwd(), target);
  }

  /**
   * 从配置读取数值
   */
  private getNumber(path: string, defaultValue: number): number {
    const value = this.configService.get<string | number | undefined>(path);
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : defaultValue;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  private async clearFileCache(fileId?: number): Promise<void> {
    if (fileId !== undefined) {
      await this.cache.del(`file:id:${fileId}`);
      await this.cache.del(`File:findOne:${fileId}`);
      return;
    }

    await this.cache.delByPattern?.('File:*');
  }

  private async findByIdOrFail(id: number): Promise<FileEntity> {
    const entity = await this.fileRepository.findOne({ where: { id } });
    if (!entity) {
      throw BusinessException.notFound('File', id);
    }
    return entity;
  }

  private async paginateFiles(
    pagination: PaginationOptions,
    query: FileQueryOptions,
  ): Promise<PaginationResult<FileEntity>> {
    const qb = this.fileRepository.createQueryBuilder('file');

    if (query.keyword) {
      qb.andWhere('(file.originalName LIKE :keyword OR file.filename LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.storage) {
      qb.andWhere('file.storage = :storage', { storage: query.storage });
    }

    if (query.status) {
      qb.andWhere('file.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('file.category = :category', { category: query.category });
    }

    if (query.module) {
      qb.andWhere('file.module = :module', { module: query.module });
    }

    if (query.isPublic !== undefined) {
      qb.andWhere('file.isPublic = :isPublic', { isPublic: query.isPublic });
    }

    qb.orderBy(
      pagination.sort ? `file.${pagination.sort}` : 'file.createdAt',
      pagination.order || 'DESC',
    );

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await qb.skip(skip).take(limit).getManyAndCount();

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
}
