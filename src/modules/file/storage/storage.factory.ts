import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '~/common/exceptions/business.exception';
import { FileStorageType } from '../entities/file.entity';
import { FileStorageStrategy } from './file-storage.interface';
import { LocalStorageStrategy } from './local-storage.strategy';
import { OssStorageStrategy } from './oss-storage.strategy';

@Injectable()
export class FileStorageFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly localStorageStrategy: LocalStorageStrategy,
    private readonly ossStorageStrategy: OssStorageStrategy,
  ) {}

  /**
   * 根据配置获取存储策略
   */
  getStrategy(storage?: FileStorageType): FileStorageStrategy {
    const type =
      storage || this.configService.get<FileStorageType>('file.storage', FileStorageType.LOCAL);

    switch (type) {
      case FileStorageType.LOCAL:
        return this.localStorageStrategy;
      case FileStorageType.OSS:
        if (!this.ossStorageStrategy.isEnabled()) {
          throw BusinessException.validationFailed('OSS 存储未启用，请检查配置');
        }
        return this.ossStorageStrategy;
      default:
        return this.localStorageStrategy;
    }
  }

  getOssStrategy(): OssStorageStrategy {
    if (!this.ossStorageStrategy.isEnabled()) {
      throw BusinessException.validationFailed('OSS 存储未启用，请检查配置');
    }
    return this.ossStorageStrategy;
  }

  getAvailableStorageTypes(): FileStorageType[] {
    const types = [FileStorageType.LOCAL];
    if (this.ossStorageStrategy.isEnabled()) {
      types.push(FileStorageType.OSS);
    }
    return types;
  }

  normalizeDefaultStorage(): FileStorageType {
    const configured = this.configService.get<FileStorageType>(
      'file.storage',
      FileStorageType.LOCAL,
    );
    return this.getAvailableStorageTypes().includes(configured)
      ? configured
      : FileStorageType.LOCAL;
  }
}
