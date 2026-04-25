import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { posix } from 'path';
import OSS from 'ali-oss';
import {
  FileStorageStrategy,
  FileStorageSaveOptions,
  StoredFileMetadata,
} from './file-storage.interface';

interface OssConfig {
  enable: boolean;
  region?: string;
  bucket?: string;
  endpoint?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  secure?: boolean;
  baseUrl?: string;
}

@Injectable()
export class OssStorageStrategy implements FileStorageStrategy {
  private readonly logger = new Logger(OssStorageStrategy.name);
  private readonly config: OssConfig;
  private client?: OSS;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<OssConfig>('file.external.oss', {
      enable: false,
    });

    if (this.isEnabled()) {
      this.client = new OSS({
        region: this.config.region,
        bucket: this.config.bucket,
        endpoint: this.config.endpoint,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        secure: this.config.secure !== false,
      });
    }
  }

  isEnabled(): boolean {
    return !!(
      this.config.enable &&
      this.config.bucket &&
      this.config.accessKeyId &&
      this.config.accessKeySecret
    );
  }

  async saveFile(buffer: Buffer, options: FileStorageSaveOptions): Promise<StoredFileMetadata> {
    const client = this.ensureClient();
    const key = this.buildObjectKey(options);

    const result = await client.put(key, buffer);

    return this.buildMetadata(key, buffer.length, options.metadata, result.url);
  }

  async delete(path: string): Promise<void> {
    const client = this.ensureClient();
    try {
      await client.delete(path);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return;
      }
      throw error;
    }
  }

  async getStream(path: string): Promise<NodeJS.ReadableStream> {
    const client = this.ensureClient();
    const result = await client.getStream(path);
    return result.stream;
  }

  private ensureClient(): OSS {
    if (!this.isEnabled() || !this.client) {
      throw new Error('OSS storage is not configured properly');
    }
    return this.client;
  }

  private buildObjectKey(options: FileStorageSaveOptions): string {
    const parts: string[] = [];
    if (options.relativePath) {
      parts.push(options.relativePath.replace(/\\/g, '/'));
    }
    parts.push(options.filename);
    return posix.join(...parts);
  }

  private buildMetadata(
    key: string,
    size: number,
    metadata?: Record<string, unknown>,
    url?: string,
  ): StoredFileMetadata {
    const objectUrl = this.buildUrl(key, url);
    this.logger.debug(`OSS saved object key=${key}, url=${objectUrl}`);
    return {
      filename: posix.basename(key),
      path: key,
      size,
      url: objectUrl,
      metadata,
    };
  }

  private buildUrl(key: string, fallbackUrl?: string): string | undefined {
    if (this.config.baseUrl) {
      const normalizedBase = this.config.baseUrl.replace(/\/$/, '');
      return `${normalizedBase}/${key}`;
    }
    if (fallbackUrl) {
      return fallbackUrl;
    }
    const client = this.client;
    if (client) {
      return client.generateObjectUrl(key);
    }
    return undefined;
  }
}
