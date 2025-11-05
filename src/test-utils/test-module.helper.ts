/**
 * 测试模块助手
 *
 * 提供常用的Mock服务和测试模块创建工具
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';

/**
 * 创建Mock Repository
 */
export function createMockRepository<T = any>(): jest.Mocked<Repository<any>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    })),
  } as any;
}

/**
 * 创建Mock JwtService
 */
export function createMockJwtService(): jest.Mocked<JwtService> {
  return {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  } as any;
}

/**
 * 创建Mock ConfigService
 */
export function createMockConfigService(
  config: Record<string, any> = {},
): jest.Mocked<ConfigService> {
  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      const keys = key.split('.');
      let value: any = config;

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          return defaultValue;
        }
      }

      return value ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value = config[key];
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" does not exist`);
      }
      return value;
    }),
  } as any;
}

/**
 * 创建Mock EventEmitter2
 */
export function createMockEventEmitter(): jest.Mocked<EventEmitter2> {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  } as any;
}

/**
 * 创建Mock LoggerService
 */
export function createMockLogger(): jest.Mocked<LoggerService> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  } as any;
}

/**
 * 创建Mock CacheService
 */
export function createMockCacheService(): jest.Mocked<CacheService> {
  const cache = new Map<string, any>();

  return {
    get: jest.fn(async <T = any>(key: string): Promise<T | null> => {
      return cache.get(key) ?? null;
    }),
    set: jest.fn(async (key: string, value: any, ttl?: number): Promise<void> => {
      cache.set(key, value);
    }),
    del: jest.fn(async (key: string): Promise<void> => {
      cache.delete(key);
    }),
    reset: jest.fn(async (): Promise<void> => {
      cache.clear();
    }),
    incr: jest.fn(async (key: string, ttl?: number): Promise<number> => {
      const current = cache.get(key) || 0;
      const newValue = current + 1;
      cache.set(key, newValue);
      return newValue;
    }),
    decr: jest.fn(async (key: string): Promise<number> => {
      const current = cache.get(key) || 0;
      const newValue = Math.max(0, current - 1);
      cache.set(key, newValue);
      return newValue;
    }),
    keys: jest.fn(async (pattern: string): Promise<string[]> => {
      return Array.from(cache.keys()).filter((key) => key.includes(pattern));
    }),
    ttl: jest.fn(async (key: string): Promise<number> => {
      return cache.has(key) ? 3600 : -2;
    }),
    acquireLock: jest.fn(async (key: string, ttl: number): Promise<string | null> => {
      if (cache.has(`lock:${key}`)) {
        return null;
      }
      const lockId = `lock-${Date.now()}`;
      cache.set(`lock:${key}`, lockId);
      return lockId;
    }),
    releaseLock: jest.fn(async (key: string, lockId: string): Promise<boolean> => {
      if (cache.get(`lock:${key}`) === lockId) {
        cache.delete(`lock:${key}`);
        return true;
      }
      return false;
    }),
    __cache: cache, // 用于测试中访问内部状态
  } as any;
}

/**
 * 创建Mock DataSource
 */
export function createMockDataSource(): jest.Mocked<DataSource> {
  return {
    query: jest.fn().mockResolvedValue([]),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        remove: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
      },
    })),
    manager: {
      save: jest.fn(),
      remove: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      transaction: jest.fn(),
    },
  } as any;
}

/**
 * 测试模块构建器配置
 */
export interface TestModuleConfig {
  providers?: any[];
  imports?: any[];
  exports?: any[];
}

/**
 * 创建测试模块
 *
 * @example
 * const module = await createTestModule({
 *   providers: [
 *     UserService,
 *     {
 *       provide: getRepositoryToken(UserEntity),
 *       useValue: createMockRepository(),
 *     },
 *   ],
 * });
 * const service = module.get<UserService>(UserService);
 */
export async function createTestModule(config: TestModuleConfig): Promise<TestingModule> {
  const moduleBuilder = Test.createTestingModule({
    providers: config.providers || [],
    imports: config.imports || [],
    exports: config.exports || [],
  });

  return moduleBuilder.compile();
}

/**
 * 默认的测试配置
 */
export const DEFAULT_TEST_CONFIG = {
  jwt: {
    secret: 'test-secret',
    expiresIn: '1h',
    refreshSecret: 'test-refresh-secret',
    refreshExpiresIn: '7d',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
  database: {
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'test',
  },
};

/**
 * 清理测试模块
 */
export async function cleanupTestModule(module: TestingModule): Promise<void> {
  if (module) {
    await module.close();
  }
}
