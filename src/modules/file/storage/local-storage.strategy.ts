import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises, createReadStream } from 'fs';
import { join, resolve, normalize, relative } from 'path';
import {
  FileStorageStrategy,
  FileStorageSaveOptions,
  StoredFileMetadata,
} from './file-storage.interface';

@Injectable()
export class LocalStorageStrategy implements FileStorageStrategy {
  private readonly rootDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const uploadDir = this.configService.get<string>('file.uploadDir', 'uploads');
    this.rootDir = this.resolveRoot(uploadDir);
    this.baseUrl = this.configService.get<string>('file.baseUrl', '/uploads');
  }

  /**
   * 保存缓冲区数据
   */
  async saveFile(buffer: Buffer, options: FileStorageSaveOptions): Promise<StoredFileMetadata> {
    const targetDirectory = this.getTargetDirectory(options.relativePath);
    await fsPromises.mkdir(targetDirectory, { recursive: true });

    const absolutePath = join(targetDirectory, options.filename);
    await fsPromises.writeFile(absolutePath, buffer);

    return this.buildMetadata(absolutePath, buffer.length, options);
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
    return resolve(this.rootDir, safePath);
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

    if (options.isPublic) {
      metadata.url = this.getPublicUrl(relativePath);
    }

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
    return resolve(this.rootDir, sanitized);
  }

  /**
   * 相对路径规范化
   */
  private sanitizeRelativePath(relativePath: string): string {
    // 防止目录穿越
    const normalized = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return normalized.split('\\').join('/');
  }

  /**
   * 获取相对路径
   */
  private getRelativePath(absolutePath: string): string {
    const relativePath = relative(this.rootDir, absolutePath);
    return relativePath.split('\\').join('/');
  }

  /**
   * 构建公开访问地址
   */
  private getPublicUrl(relativePath: string): string {
    const normalized = relativePath.replace(/^\//, '');
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${base}/${normalized}`;
  }
}
