import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import dayjs from 'dayjs';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import { FileUtil } from '~/common/utils';
import { FileEntity, FileStatus, FileStorageType } from '../entities/file.entity';
import { FileRepository, FileQueryOptions } from '../repositories/file.repository';
import { UploadFileDto } from '../dto/upload-file.dto';
import { UploadChunkDto } from '../dto/upload-chunk.dto';
import { QueryFileDto } from '../dto/query-file.dto';
import { FileStorageFactory } from '../storage/storage.factory';
import { FileStorageStrategy } from '../storage/file-storage.interface';

interface UserWithRoles {
  id: number;
  roles?: Array<{ code: string }>;
}

export interface UploadProgress {
  uploadId: string;
  filename: string;
  totalChunks: number;
  uploadedChunks: number;
  chunkSize: number;
  totalSize: number;
  uploadedSize: number;
  status: FileStatus;
  storage: FileStorageType;
  module?: string;
  tags?: string;
  isPublic: boolean;
  hash?: string;
  remark?: string;
  uploaderId?: number;
  startedAt: number;
  updatedAt: number;
  fileId?: number;
}

interface ImageProcessResult {
  buffer: Buffer;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
  thumbnail?: {
    buffer: Buffer;
    filename: string;
  };
}

@Injectable()
export class FileService extends BaseService<FileEntity> {
  protected repository: FileRepository;

  private readonly storageType: FileStorageType;
  private readonly uploadRoot: string;
  private readonly tempRoot: string;
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];
  private readonly chunkExpireSeconds: number;
  private readonly defaultChunkSize: number;
  private readonly imageOptions: {
    compress: boolean;
    quality: number;
    maxWidth: number;
    thumbnail: {
      enable: boolean;
      width: number;
      height: number;
    };
  };

  constructor(
    private readonly fileRepository: FileRepository,
    private readonly configService: ConfigService,
    private readonly storageFactory: FileStorageFactory,
    logger: LoggerService,
    cache: CacheService,
  ) {
    super();
    this.repository = fileRepository;
    this.logger = logger;
    this.cache = cache;
    this.logger.setContext(FileService.name);

    this.storageType = this.configService.get<FileStorageType>(
      'file.storage',
      FileStorageType.LOCAL,
    );
    this.uploadRoot = this.resolvePath(this.configService.get<string>('file.uploadDir', 'uploads'));
    this.tempRoot = this.resolvePath(
      this.configService.get<string>('file.tempDir', 'uploads/temp'),
    );
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
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.txt',
        '.zip',
      ]),
    );
    this.defaultChunkSize = this.getNumber('file.chunk.defaultSize', 5 * 1024 * 1024);
    this.chunkExpireSeconds = this.getNumber('file.chunk.expire', 24 * 60 * 60);
    this.imageOptions = {
      compress: this.getBoolean('file.image.compress', true),
      quality: this.getNumber('file.image.quality', 80),
      maxWidth: this.getNumber('file.image.maxWidth', 1920),
      thumbnail: {
        enable: this.getBoolean('file.image.thumbnail.enable', true),
        width: this.getNumber('file.image.thumbnail.width', 320),
        height: this.getNumber('file.image.thumbnail.height', 320),
      },
    };

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

    // 将图片类文件预处理为压缩图与缩略图，非图片文件则原样返回
    const imageResult = await this.processImageIfNeeded(file, relativePath, uniqueFilename);

    const stored = await storage.saveFile(imageResult.buffer ?? file.buffer, {
      filename: uniqueFilename,
      relativePath,
      isPublic: options.isPublic ?? false,
      metadata: imageResult.metadata,
    });
    this.logger?.log(
      `[FileUpload] Stored file "${stored.filename}" via ${this.storageType} (path=${stored.path})`,
    );

    let thumbnailPath: string | undefined;
    let thumbnailUrl: string | undefined;
    if (imageResult.thumbnail) {
      const thumbFilename = imageResult.thumbnail.filename;
      const thumbStored = await storage.saveFile(imageResult.thumbnail.buffer, {
        filename: thumbFilename,
        relativePath: join(relativePath, 'thumbnails'),
        isPublic: options.isPublic ?? false,
      });
      thumbnailPath = thumbStored.path;
      thumbnailUrl = thumbStored.url;
    }

    const entity = await this.repository.createAndSave({
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
      width: imageResult.width,
      height: imageResult.height,
      thumbnailPath,
      thumbnailUrl,
      uploaderId,
    });

    await this.clearCache();

    return entity;
  }

  /**
   * 分片上传
   */
  async uploadChunk(
    file: Express.Multer.File,
    dto: UploadChunkDto,
    uploaderId?: number,
  ): Promise<{ completed: boolean; file?: FileEntity; progress: UploadProgress }> {
    if (!file) {
      throw BusinessException.validationFailed('请上传分片文件');
    }

    this.validateChunk(dto, file);

    const chunkDir = await this.ensureChunkDirectory(dto.uploadId);
    const chunkPath = join(chunkDir, `${dto.chunkIndex}`);
    const existed = await this.pathExists(chunkPath);

    await fsPromises.writeFile(chunkPath, file.buffer!);

    const progress = await this.updateProgress(dto, file.size, !existed, uploaderId);

    if (progress.uploadedChunks === dto.totalChunks) {
      const merged = await this.mergeChunks(progress);
      const finalFile = await this.saveMergedFile(merged, progress);

      progress.status = FileStatus.AVAILABLE;
      progress.fileId = finalFile.id;
      progress.updatedAt = Date.now();
      await this.cache.set(
        this.getUploadCacheKey(progress.uploadId),
        progress,
        this.chunkExpireSeconds,
      );

      await this.cleanupChunks(progress.uploadId);
      this.logger?.log(
        `[FileUpload] Chunk upload completed uploadId=${progress.uploadId}, fileId=${finalFile.id}`,
      );

      return {
        completed: true,
        file: finalFile,
        progress,
      };
    }

    this.logger?.debug(
      `[FileUpload] Received chunk ${dto.chunkIndex}/${dto.totalChunks} for uploadId=${dto.uploadId}`,
    );

    return {
      completed: false,
      progress,
    };
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

    return this.repository.paginateFiles(paginationOptions, filters);
  }

  /**
   * 根据ID查询文件
   */
  async findById(id: number): Promise<FileEntity> {
    return this.repository.findByIdOrFail(id);
  }

  /**
   * 根据ID查询文件（别名，兼容controller）
   */
  async findOne(id: number): Promise<FileEntity | null> {
    try {
      return await this.findById(id);
    } catch (error) {
      return null;
    }
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
      (role) => role.code === 'admin' || role.code === 'super_admin',
    );

    if (!hasAdminPermission) {
      throw BusinessException.forbidden('无权下载此文件');
    }
  }

  /**
   * 获取上传进度
   */
  async getUploadProgress(uploadId: string): Promise<UploadProgress | null> {
    if (!uploadId) {
      return null;
    }
    return this.cache.get<UploadProgress>(this.getUploadCacheKey(uploadId));
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

    if (entity.thumbnailPath) {
      await storage.delete(entity.thumbnailPath);
    }

    await super.remove(id);

    // 删除后清除缓存
    await this.cache.del(`file:id:${id}`);
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
   * 生成文件下载签名 URL
   * @param id 文件ID
   * @param userId 当前用户ID
   * @param expiresIn 过期时间（秒），默认 3600（1小时）
   * @param isAdmin 是否为管理员
   * @returns 签名 URL
   */
  async generateDownloadUrl(
    id: number,
    userId: number,
    expiresIn = 3600,
    isAdmin = false,
  ): Promise<string> {
    const entity = await this.findById(id);

    // 权限检查：文件上传者或管理员可以生成下载链接
    if (!isAdmin && entity.uploaderId && entity.uploaderId !== userId) {
      throw BusinessException.forbidden('无权访问此文件');
    }

    const storage = this.getStorageStrategy(entity.storage);

    // 检查存储策略是否支持签名 URL
    if (!storage.generateSignedUrl) {
      throw BusinessException.operationFailed('generate signed URL', '当前存储策略不支持签名 URL');
    }

    const signedUrl = await storage.generateSignedUrl(entity.path, expiresIn, entity.originalName);

    this.logger?.log(
      `Generated signed URL for file ${entity.id} (${entity.originalName}), userId=${userId}, expires in ${expiresIn}s`,
    );

    return signedUrl;
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
   * 验证分片
   */
  private validateChunk(dto: UploadChunkDto, file: Express.Multer.File): void {
    if (dto.chunkSize > this.defaultChunkSize * 4) {
      throw BusinessException.validationFailed('单个分片大小超出限制');
    }

    if (dto.totalSize > this.maxFileSize * 5) {
      throw BusinessException.validationFailed('文件总大小超出系统限制');
    }

    const allowed = FileUtil.validateFileType(dto.filename, this.allowedTypes);
    if (!allowed) {
      throw BusinessException.validationFailed(
        `不支持的文件类型，仅允许：${this.allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * 处理图片压缩与缩略图
   */
  private async processImageIfNeeded(
    file: Express.Multer.File,
    relativePath: string,
    filename: string,
  ): Promise<ImageProcessResult> {
    if (!FileUtil.isImage(file.originalname)) {
      return { buffer: file.buffer! };
    }

    try {
      const sharpModule = await this.loadSharp();
      if (!sharpModule) {
        return { buffer: file.buffer! };
      }

      const image = sharpModule(file.buffer, { failOnError: false });
      const metadata = await image.metadata();
      let processed = image;

      if (this.imageOptions.compress && metadata.width) {
        processed = processed.resize({
          width: Math.min(metadata.width, this.imageOptions.maxWidth),
          withoutEnlargement: true,
          fit: 'inside',
        });
      }

      const format = (
        metadata.format ||
        FileUtil.getExtensionWithoutDot(filename) ||
        'jpeg'
      ).toLowerCase();

      let buffer: Buffer;
      switch (format) {
        case 'jpeg':
        case 'jpg':
          buffer = await processed.jpeg({ quality: this.imageOptions.quality }).toBuffer();
          break;
        case 'png':
          buffer = await processed.png({ compressionLevel: 9 }).toBuffer();
          break;
        case 'webp':
          buffer = await processed.webp({ quality: this.imageOptions.quality }).toBuffer();
          break;
        default:
          buffer = await processed.toBuffer();
          break;
      }

      const result: ImageProcessResult = {
        buffer,
        width: metadata.width,
        height: metadata.height,
        metadata: {
          format,
          width: metadata.width,
          height: metadata.height,
          size: buffer.length,
        },
      };

      if (this.imageOptions.thumbnail.enable) {
        const baseName = FileUtil.getBasename(filename);
        const thumbFormat = ['png', 'webp', 'jpeg', 'jpg'].includes(format) ? format : 'jpeg';
        const thumbExt = thumbFormat === 'jpeg' ? 'jpg' : thumbFormat;
        const thumbFilename = `${baseName}_thumb.${thumbExt}`;
        let thumbPipeline = sharpModule(file.buffer).resize({
          width: this.imageOptions.thumbnail.width,
          height: this.imageOptions.thumbnail.height,
          fit: 'cover',
        });

        switch (thumbFormat) {
          case 'png':
            thumbPipeline = thumbPipeline.png({ compressionLevel: 9 });
            break;
          case 'webp':
            thumbPipeline = thumbPipeline.webp({ quality: this.imageOptions.quality });
            break;
          default:
            thumbPipeline = thumbPipeline.jpeg({ quality: this.imageOptions.quality });
            break;
        }

        const thumbnailBuffer = await thumbPipeline.toBuffer();

        result.thumbnail = {
          buffer: thumbnailBuffer,
          filename: thumbFilename,
        };
      }

      return result;
    } catch (error) {
      this.logger?.warn(
        `图片处理失败，使用原始文件：${error instanceof Error ? error.message : error}`,
      );
      return { buffer: file.buffer! };
    }
  }

  /**
   * 合并分片
   */
  private async mergeChunks(progress: UploadProgress): Promise<{ path: string; buffer: Buffer }> {
    const chunkDir = join(this.tempRoot, progress.uploadId);
    const mergedPath = join(chunkDir, `merged_${Date.now()}`);

    const chunks: Buffer[] = [];
    this.logger?.debug(
      `[FileUpload] Merging ${progress.totalChunks} chunks for uploadId=${progress.uploadId}`,
    );
    for (let index = 1; index <= progress.totalChunks; index += 1) {
      const chunkPath = join(chunkDir, `${index}`);
      if (!(await this.pathExists(chunkPath))) {
        throw BusinessException.operationFailed('merge chunks', `缺少第 ${index} 个分片`);
      }
      const chunk = await fsPromises.readFile(chunkPath);
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    await fsPromises.writeFile(mergedPath, buffer);

    return { path: mergedPath, buffer };
  }

  /**
   * 保存合并后的文件
   */
  private async saveMergedFile(
    merged: { path: string; buffer: Buffer },
    progress: UploadProgress,
  ): Promise<FileEntity> {
    const storage = this.getStorageStrategy();
    const relativePath = this.buildRelativePath(progress.module);
    const uniqueFilename = FileUtil.generateUniqueFilename(progress.filename);
    const category = FileUtil.getFileCategory(progress.filename);
    const hash = this.computeHash(merged.buffer);

    const pseudoFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: progress.filename,
      encoding: '7bit',
      mimetype: FileUtil.getMimeType(progress.filename),
      size: merged.buffer.length,
      destination: '',
      filename: uniqueFilename,
      path: merged.path,
      buffer: merged.buffer,
      stream: undefined as any,
    };

    // 复用统一的图片处理逻辑，确保分片合并后的资源与直传路径一致
    const imageResult = await this.processImageIfNeeded(pseudoFile, relativePath, uniqueFilename);

    const stored = await storage.saveFile(imageResult.buffer ?? merged.buffer, {
      filename: uniqueFilename,
      relativePath,
      isPublic: progress.isPublic,
      metadata: imageResult.metadata,
    });

    let thumbnailPath: string | undefined;
    let thumbnailUrl: string | undefined;
    if (imageResult.thumbnail) {
      const thumbStored = await storage.saveFile(imageResult.thumbnail.buffer, {
        filename: imageResult.thumbnail.filename,
        relativePath: join(relativePath, 'thumbnails'),
        isPublic: progress.isPublic,
      });
      thumbnailPath = thumbStored.path;
      thumbnailUrl = thumbStored.url;
    }

    const entity = await this.repository.createAndSave({
      originalName: progress.filename,
      filename: stored.filename,
      path: stored.path,
      url: stored.url,
      mimeType: FileUtil.getMimeType(progress.filename),
      size: stored.size,
      category,
      storage: this.storageType,
      hash,
      module: progress.module,
      tags: progress.tags,
      isPublic: progress.isPublic,
      remark: progress.remark,
      status: FileStatus.AVAILABLE,
      metadata: stored.metadata,
      width: imageResult.width,
      height: imageResult.height,
      thumbnailPath,
      thumbnailUrl,
      uploaderId: progress.uploaderId,
    });

    await this.clearCache();

    return entity;
  }

  /**
   * 更新上传进度
   */
  private async updateProgress(
    dto: UploadChunkDto,
    chunkSize: number,
    increase: boolean,
    uploaderId?: number,
  ): Promise<UploadProgress> {
    const cacheKey = this.getUploadCacheKey(dto.uploadId);
    const now = Date.now();
    const existing = await this.cache.get<UploadProgress>(cacheKey);

    const progress: UploadProgress = existing ?? {
      uploadId: dto.uploadId,
      filename: dto.filename,
      totalChunks: dto.totalChunks,
      uploadedChunks: 0,
      chunkSize: dto.chunkSize,
      totalSize: dto.totalSize,
      uploadedSize: 0,
      status: FileStatus.UPLOADING,
      storage: this.storageType,
      module: dto.module,
      tags: dto.tags,
      isPublic: dto.isPublic ?? false,
      hash: dto.hash,
      remark: dto.remark,
      uploaderId,
      startedAt: now,
      updatedAt: now,
    };

    if (increase) {
      progress.uploadedChunks += 1;
      progress.uploadedSize += chunkSize;
    }

    progress.updatedAt = now;
    await this.cache.set(cacheKey, progress, this.chunkExpireSeconds);
    return progress;
  }

  /**
   * 确保临时目录存在
   */
  private async ensureChunkDirectory(uploadId: string): Promise<string> {
    const dir = join(this.tempRoot, uploadId);
    await fsPromises.mkdir(dir, { recursive: true });
    this.logger?.debug(`[FileUpload] Ensure chunk directory: ${dir}`);
    return dir;
  }

  /**
   * 清理临时目录
   */
  private async cleanupChunks(uploadId: string): Promise<void> {
    const dir = join(this.tempRoot, uploadId);
    try {
      this.logger?.debug(`[FileUpload] Clean up chunk directory for uploadId=${uploadId}`);
      await fsPromises.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // ignore cleanup errors
    }
    await this.cache.del(this.getUploadCacheKey(uploadId));
  }

  /**
   * 路径是否存在
   */
  private async pathExists(path: string): Promise<boolean> {
    try {
      await fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取缓存键
   */
  private getUploadCacheKey(uploadId: string): string {
    return `upload:progress:${uploadId}`;
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
    await fsPromises.mkdir(this.tempRoot, { recursive: true });
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
   * 从配置读取布尔值
   */
  private getBoolean(path: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string | boolean | undefined>(path);
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value).toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
    return defaultValue;
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

  /**
   * 动态加载 sharp
   */
  private async loadSharp(): Promise<any | null> {
    try {
      const sharp = await import('sharp');
      return sharp.default || sharp;
    } catch (error) {
      this.logger?.warn('未安装 sharp，跳过图片压缩和缩略图生成');
      return null;
    }
  }
}
