import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises, createReadStream } from 'fs';
import { basename, isAbsolute, normalize, relative, resolve } from 'path';
import {
  FileStorageStrategy,
  FileStorageSaveOptions,
  StoredFileMetadata,
} from './file-storage.interface';

@Injectable()
export class LocalStorageStrategy implements FileStorageStrategy {
  private readonly rootDir: string;

  constructor(private readonly configService: ConfigService) {
    const uploadDir = this.configService.get<string>('file.uploadDir', 'uploads');
    this.rootDir = this.resolveRoot(uploadDir);
  }

  /**
   * 保存缓冲区数据
   */
  async saveFile(buffer: Buffer, options: FileStorageSaveOptions): Promise<StoredFileMetadata> {
    const targetDirectory = this.getTargetDirectory(options.relativePath);
    await fsPromises.mkdir(targetDirectory, { recursive: true });

    const filename = this.sanitizeFilename(options.filename);
    const absolutePath = this.ensureInsideRoot(resolve(targetDirectory, filename));
    await fsPromises.writeFile(absolutePath, buffer);

    return this.buildMetadata(absolutePath, buffer.length, {
      ...options,
      filename,
    });
  }

  /**
   * 删除文件
   */
  async delete(path: string): Promise<void> {
    const absolutePath = this.toAbsolutePath(path);

    try {
      await fsPromises.unlink(absolutePath);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * 获取下载流
   */
  async getStream(path: string): Promise<NodeJS.ReadableStream> {
    const absolutePath = this.toAbsolutePath(path);
    return createReadStream(absolutePath);
  }

  /**
   * 获取绝对路径（用于服务内部操作）
   */
  private toAbsolutePath(path: string): string {
    const safePath = this.sanitizeRelativePath(path);
    return this.resolveInsideRoot(safePath);
  }

  /**
   * 构建响应元数据
   */
  private buildMetadata(
    absolutePath: string,
    size: number,
    options: FileStorageSaveOptions,
  ): StoredFileMetadata {
    const relativePath = this.getRelativePath(absolutePath);
    const metadata: StoredFileMetadata = {
      filename: options.filename,
      path: relativePath,
      size,
      metadata: options.metadata,
    };

    return metadata;
  }

  /**
   * 解析根目录
   */
  private resolveRoot(target: string): string {
    const absolute = resolve(process.cwd(), target);
    return absolute;
  }

  /**
   * 获取目标目录
   */
  private getTargetDirectory(relativePath?: string): string {
    if (!relativePath) {
      return this.rootDir;
    }
    const sanitized = this.sanitizeRelativePath(relativePath);
    return this.resolveInsideRoot(sanitized);
  }

  /**
   * 相对路径规范化
   */
  private sanitizeRelativePath(relativePath: string): string {
    const normalized = normalize(relativePath).split('\\').join('/');
    if (!normalized || normalized === '.') {
      return '';
    }

    if (isAbsolute(normalized) || normalized.split('/').includes('..')) {
      throw new BadRequestException('非法文件路径');
    }

    return normalized.replace(/^\/+/, '');
  }

  private sanitizeFilename(filename: string): string {
    const sanitized = basename(filename);
    if (!sanitized || sanitized === '.' || sanitized === '..') {
      throw new BadRequestException('非法文件名');
    }

    return sanitized;
  }

  private resolveInsideRoot(relativePath: string): string {
    return this.ensureInsideRoot(resolve(this.rootDir, relativePath));
  }

  private ensureInsideRoot(absolutePath: string): string {
    const relativePath = relative(this.rootDir, absolutePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('非法文件路径');
    }

    return absolutePath;
  }

  /**
   * 获取相对路径
   */
  private getRelativePath(absolutePath: string): string {
    const relativePath = relative(this.rootDir, absolutePath);
    return relativePath.split('\\').join('/');
  }
}
