import { SetMetadata } from '@nestjs/common';

/**
 * 缓存元数据接口
 */
export interface CacheableMetadata {
  /** 缓存键前缀 */
  prefix: string;
  /** 缓存时间（秒），默认3600秒（1小时） */
  ttl?: number;
  /** 是否包含所有参数在缓存键中，默认true */
  includeAllArgs?: boolean;
  /** 指定参数索引作为缓存键的一部分 */
  argIndexes?: number[];
}

export const CACHEABLE_KEY = 'cacheable';

/**
 * 缓存装饰器
 * 自动缓存方法返回值
 *
 * @example
 * ```typescript
 * // 缓存1小时，使用所有参数作为缓存键
 * @Cacheable({ prefix: 'user', ttl: 3600 })
 * async getUserById(id: number) {
 *   return this.userRepository.findOne({ where: { id } });
 * }
 *
 * // 只使用第一个参数作为缓存键
 * @Cacheable({ prefix: 'user:profile', argIndexes: [0] })
 * async getUserProfile(userId: number, includeDetails: boolean) {
 *   // ...
 * }
 * ```
 */
export const Cacheable = (metadata: CacheableMetadata) => SetMetadata(CACHEABLE_KEY, metadata);
