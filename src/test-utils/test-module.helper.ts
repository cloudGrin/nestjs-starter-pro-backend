/**
 * 测试模块助手
 *
 * 提供常用的Mock服务和测试模块创建工具
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';

/**
 * 创建Mock Repository
 */
export function createMockRepository<T extends ObjectLiteral = any>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn(),
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
 * 创建Mock LoggerService
 */
export function createMockLogger(): jest.Mocked<LoggerService> {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
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
    set: jest.fn(async (key: string, value: any, _ttl?: number): Promise<void> => {
      cache.set(key, value);
    }),
    del: jest.fn(async (key: string): Promise<void> => {
      cache.delete(key);
    }),
    reset: jest.fn(async (): Promise<void> => {
      cache.clear();
    }),
    incr: jest.fn(async (key: string, _ttl?: number): Promise<number> => {
      const current = cache.get(key) || 0;
      const newValue = current + 1;
      cache.set(key, newValue);
      return newValue;
    }),
    delByPattern: jest.fn(async (pattern: string): Promise<void> => {
      for (const key of Array.from(cache.keys())) {
        if (key.includes(pattern.replace('*', ''))) {
          cache.delete(key);
        }
      }
    }),
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
