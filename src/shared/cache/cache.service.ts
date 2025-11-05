import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CacheService.name);
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Failed to get cache for key: ${key}`, error.stack);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to set cache for key: ${key}`, error.stack);
    }
  }

  /**
   * 删除缓存值
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache for key: ${key}`, error.stack);
    }
  }

  /**
   * 重置缓存
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v6 不再支持reset()方法，需要通过stores实现
      const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
      if (store && typeof store.reset === 'function') {
        await store.reset();
      } else if (store && store.client && typeof store.client.flushdb === 'function') {
        // 对于Redis store，使用flushdb
        await store.client.flushdb();
      }
      this.logger.debug('Cache reset successfully');
    } catch (error) {
      this.logger.error('Failed to reset cache', error.stack);
    }
  }

  /**
   * 使用模式删除缓存
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // 这里需要根据实际的 Redis 客户端实现
      // 暂时使用简单的实现
      const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
      if (store.client && typeof store.client.keys === 'function') {
        const keys = await store.client.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.del(key)));
          this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache by pattern: ${pattern}`, error.stack);
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const startTime = Date.now();

    try {
      // 先尝试从缓存获取
      const cached = await this.get<T>(key);
      if (cached !== null) {
        const hitTime = Date.now() - startTime;
        this.logger.debug(`🎯 Cache HIT: ${key} (耗时: ${hitTime}ms)`);
        return cached;
      }

      this.logger.debug(`❌ Cache MISS: ${key}`);

      // 缓存未命中，执行 factory 函数获取数据
      const factoryStartTime = Date.now();
      const value = await factory();
      const factoryTime = Date.now() - factoryStartTime;

      // 将结果存入缓存
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `📦 Cache SET: ${key} (factory耗时: ${factoryTime}ms, 总耗时: ${totalTime}ms)`,
      );

      return value;
    } catch (error) {
      this.logger.error(`Failed to get or set cache for key: ${key}`, error.stack);
      // 如果出错，直接返回 factory 的结果
      return factory();
    }
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    try {
      await Promise.all(
        keys.map(async (key) => {
          const value = await this.get<T>(key);
          if (value !== null) {
            result.set(key, value);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Failed to batch get cache', error.stack);
    }
    return result;
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(items: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    try {
      await Promise.all(items.map(({ key, value, ttl }) => this.set(key, value, ttl)));
      this.logger.debug(`Batch set ${items.length} cache items`);
    } catch (error) {
      this.logger.error('Failed to batch set cache', error.stack);
    }
  }

  /**
   * 获取分布式锁
   * @param key 锁的key
   * @param ttl 锁的过期时间（毫秒）
   * @param retries 重试次数
   * @param retryDelay 重试延迟（毫秒）
   * @returns 锁ID，如果获取失败返回null
   */
  async acquireLock(
    key: string,
    ttl: number = 5000,
    retries: number = 3,
    retryDelay: number = 100,
  ): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lockKey = `lock:${key}`;

    for (let i = 0; i < retries; i++) {
      try {
        const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
        if (store.client && typeof store.client.set === 'function') {
          // 使用Redis的SET NX EX命令
          const result = await store.client.set(lockKey, lockId, 'PX', ttl, 'NX');
          if (result === 'OK') {
            this.logger.debug(`Acquired lock: ${key} with ID: ${lockId}`);
            return lockId;
          }
        } else {
          // 回退方案：使用缓存实现（不完全可靠）
          const existing = await this.get(lockKey);
          if (!existing) {
            await this.set(lockKey, lockId, ttl);
            return lockId;
          }
        }

        // 获取锁失败，等待后重试
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        this.logger.error(`Failed to acquire lock for key: ${key}`, error.stack);
      }
    }

    this.logger.warn(`Failed to acquire lock after ${retries} retries: ${key}`);
    return null;
  }

  /**
   * 释放分布式锁
   * @param key 锁的key
   * @param lockId 锁的ID
   */
  async releaseLock(key: string, lockId: string | null): Promise<void> {
    if (!lockId) {
      return;
    }

    const lockKey = `lock:${key}`;
    try {
      const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
      if (store.client && typeof store.client.eval === 'function') {
        // 使用Lua脚本确保只删除自己的锁
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        await store.client.eval(script, 1, lockKey, lockId);
      } else {
        // 回退方案
        const existing = await this.get(lockKey);
        if (existing === lockId) {
          await this.del(lockKey);
        }
      }
      this.logger.debug(`Released lock: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to release lock for key: ${key}`, error.stack);
    }
  }

  /**
   * 使用分布式锁执行操作
   * @param key 锁的key
   * @param operation 要执行的操作
   * @param ttl 锁的过期时间（毫秒）
   */
  async withLock<T>(key: string, operation: () => Promise<T>, ttl: number = 5000): Promise<T> {
    const lockId = await this.acquireLock(key, ttl);
    if (!lockId) {
      throw new Error(`Failed to acquire lock: ${key}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(key, lockId);
    }
  }

  /**
   * 查找匹配模式的所有keys
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
      if (store.client && typeof store.client.keys === 'function') {
        return await store.client.keys(pattern);
      }
      return [];
    } catch (error) {
      this.logger.error(`Failed to get keys for pattern: ${pattern}`, error.stack);
      return [];
    }
  }

  /**
   * 增加数值
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const store = (this.cacheManager as any).store || (this.cacheManager.stores?.[0] as any);
      if (store.client && typeof store.client.incr === 'function') {
        const value = await store.client.incr(key);
        if (ttl) {
          await store.client.expire(key, Math.floor(ttl / 1000));
        }
        return value;
      }

      // 回退方案
      const current = (await this.get<number>(key)) || 0;
      const newValue = current + 1;
      await this.set(key, newValue, ttl);
      return newValue;
    } catch (error) {
      this.logger.error(`Failed to increment key: ${key}`, error.stack);
      return 0;
    }
  }

  /**
   * 增加数值（别名方法，为了兼容性）
   */
  async increment(key: string, ttl?: number): Promise<number> {
    return this.incr(key, ttl);
  }

  /**
   * 减少数值（用于限流回滚）
   */
  async decrement(key: string): Promise<number> {
    try {
      // 获取store实例（Redis或内存存储）
      const store = (this.cacheManager as any).store;

      // 如果是Redis存储，使用原生decr命令
      if (store && store.client) {
        const result = await store.client.decr(key);
        return result;
      }

      // 回退方案：手动实现减少逻辑
      const current = (await this.get<number>(key)) || 0;
      const newValue = Math.max(0, current - 1); // 确保不会小于0
      await this.set(key, newValue);
      return newValue;
    } catch (error) {
      this.logger.error(`Failed to decrement key: ${key}`, error.stack);
      return 0;
    }
  }
}
