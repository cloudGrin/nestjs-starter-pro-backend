import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fsPromises, createReadStream } from 'fs';
import { posix } from 'path';
import { Client as MinioClient } from 'minio';
import {
  FileStorageStrategy,
  FileStorageSaveOptions,
  StoredFileMetadata,
} from './file-storage.interface';

interface MinioConfig {
  enable: boolean;
  endPoint?: string;
  port?: number;
  useSSL?: boolean;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  baseUrl?: string;
  region?: string;
}

@Injectable()
export class MinioStorageStrategy implements FileStorageStrategy {
  private readonly logger = new Logger(MinioStorageStrategy.name);
  private readonly config: MinioConfig;
  private client?: MinioClient;
  private bucketChecked = false;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<MinioConfig>('file.external.minio', {
      enable: false,
    });

    if (this.isEnabled()) {
      this.client = new MinioClient({
        endPoint: this.config.endPoint!,
        port: this.config.port,
        useSSL: this.config.useSSL !== false,
        accessKey: this.config.accessKey!,
        secretKey: this.config.secretKey!,
        region: this.config.region,
      });
    }
  }

  isEnabled(): boolean {
    return !!(
      this.config.enable &&
      this.config.bucket &&
      this.config.endPoint &&
      this.config.accessKey &&
      this.config.secretKey
    );
  }

  async saveFile(buffer: Buffer, options: FileStorageSaveOptions): Promise<StoredFileMetadata> {
    const client = await this.ensureClient();
    const key = this.buildObjectKey(options);

    await client.putObject(this.config.bucket!, key, buffer);

    return this.buildMetadata(key, buffer.length, options.metadata);
  }

  async saveFromPath(
    tempPath: string,
    options: FileStorageSaveOptions,
  ): Promise<StoredFileMetadata> {
    const client = await this.ensureClient();
    const key = this.buildObjectKey(options);
    const stats = await fsPromises.stat(tempPath);

    await client.putObject(this.config.bucket!, key, createReadStream(tempPath));

    return this.buildMetadata(key, stats.size, options.metadata);
  }

  async delete(path: string): Promise<void> {
    const client = await this.ensureClient();
    try {
      await client.removeObject(this.config.bucket!, path);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'NoSuchKey') {
        return;
      }
      throw error;
    }
  }

  async getStream(path: string): Promise<NodeJS.ReadableStream> {
    const client = await this.ensureClient();
    return client.getObject(this.config.bucket!, path);
  }

  async exists(path: string): Promise<boolean> {
    const client = await this.ensureClient();
    try {
      await client.statObject(this.config.bucket!, path);
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error.code === 'NotFound' || error.code === 'NoSuchKey')) {
        return false;
      }
      throw error;
    }
  }

  toAbsolutePath(path: string): string {
    return this.buildUrl(path) || path;
  }

  /**
   * 生成临时签名 URL（用于安全下载）
   * @param path 文件路径
   * @param expiresIn 过期时间（秒），默认 3600（1小时）
   * @param filename 下载时的文件名（用于 Content-Disposition）
   * @returns 临时签名 URL
   */
  async generateSignedUrl(path: string, expiresIn = 3600, filename?: string): Promise<string> {
    const client = await this.ensureClient();

    const params: Record<string, string> = {};

    // 设置 Content-Disposition 以指定下载时的文件名
    if (filename) {
      params['response-content-disposition'] =
        `attachment; filename="${encodeURIComponent(filename)}"`;
    }

    const signedUrl = await client.presignedGetObject(this.config.bucket!, path, expiresIn, params);

    this.logger.debug(`Generated MinIO signed URL for ${path}, expires in ${expiresIn}s`);

    return signedUrl;
  }

  private async ensureClient(): Promise<MinioClient> {
    if (!this.isEnabled() || !this.client) {
      throw new Error('MinIO storage is not configured properly');
    }

    // 确保目标桶存在
    if (!this.bucketChecked) {
      const exists = await this.client.bucketExists(this.config.bucket!);
      if (!exists) {
        await this.client.makeBucket(this.config.bucket!, this.config.region);
      }
      this.bucketChecked = true;
    }

    return this.client;
  }

  private buildObjectKey(options: FileStorageSaveOptions): string {
    const segments: string[] = [];
    if (options.relativePath) {
      segments.push(options.relativePath.replace(/\\/g, '/'));
    }
    segments.push(options.filename);
    return posix.join(...segments);
  }

  private buildMetadata(
    key: string,
    size: number,
    metadata?: Record<string, unknown>,
  ): StoredFileMetadata {
    const url = this.buildUrl(key);
    this.logger.debug(`MinIO saved object key=${key}, url=${url}`);
    return {
      filename: posix.basename(key),
      path: key,
      size,
      url,
      metadata,
    };
  }

  private buildUrl(key: string): string | undefined {
    if (this.config.baseUrl) {
      const normalized = this.config.baseUrl.replace(/\/$/, '');
      return `${normalized}/${key}`;
    }

    if (!this.client) {
      return undefined;
    }

    const protocol = this.config.useSSL !== false ? 'https' : 'http';
    const portSegment = this.config.port ? `:${this.config.port}` : '';
    return `${protocol}://${this.config.endPoint}${portSegment}/${this.config.bucket}/${key}`;
  }
}
