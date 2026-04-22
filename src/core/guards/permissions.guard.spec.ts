/**
 * PermissionsGuard 单元测试
 *
 * 测试目标：
 * 1. 验证 SQL 查询使用正确的列名（isActive 而非 is_active）
 * 2. 验证权限检查逻辑（OR逻辑）
 * 3. 验证通配符权限匹配
 * 4. 验证超级管理员直接放行
 * 5. 验证缓存机制
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from 'typeorm';
import { PermissionsGuard } from './permissions.guard';
import { RoleRepository } from '~/modules/role/repositories/role.repository';
import { PermissionRepository } from '~/modules/permission/repositories/permission.repository';
import { CacheService } from '~/shared/cache/cache.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { CACHE_KEYS } from '~/common/constants/cache.constants';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionRepository: jest.Mocked<PermissionRepository>;
  let cacheService: jest.Mocked<CacheService>;
  let logger: jest.Mocked<LoggerService>;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    // Mock QueryBuilder
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    const mockPermissionRepository = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockEntityManager = {};

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getOrSet: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockRoleRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RoleRepository, useValue: mockRoleRepository },
        { provide: PermissionRepository, useValue: mockPermissionRepository },
        { provide: EntityManager, useValue: mockEntityManager },
        { provide: CacheService, useValue: mockCacheService },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    permissionRepository = module.get(PermissionRepository);
    cacheService = module.get(CacheService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: null,
        method: 'GET',
        url: '/api/v1/users',
      };

      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: () => mockRequest,
        }),
      } as any;
    });

    it('应该定义', () => {
      expect(guard).toBeDefined();
    });

    const mockMetadata = (metadata: Record<string, unknown>) => {
      reflector.getAllAndOverride.mockImplementation((key: string) => metadata[key]);
    };

    describe('公开接口', () => {
      it('当接口标记为公开时，应该直接放行', async () => {
        // Arrange
        mockMetadata({ [IS_PUBLIC_KEY]: true });

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        expect(permissionRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('已登录即可访问的接口', () => {
      it('当接口标记为已登录即可访问且用户已登录时，应该直接放行', async () => {
        // Arrange
        mockMetadata({ [ALLOW_AUTHENTICATED_KEY]: true });
        mockRequest.user = {
          id: 2,
          username: 'testuser',
          isSuperAdmin: false,
        };

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        expect(permissionRepository.createQueryBuilder).not.toHaveBeenCalled();
      });

      it('当接口标记为已登录即可访问但用户未登录时，应该拒绝访问', async () => {
        // Arrange
        mockMetadata({ [ALLOW_AUTHENTICATED_KEY]: true });
        mockRequest.user = null;

        // Act & Assert
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(mockContext)).rejects.toThrow('未登录或登录已过期');
      });
    });

    describe('无权限声明的接口', () => {
      it('当已登录用户访问未声明权限的接口时，应该拒绝访问', async () => {
        // Arrange
        mockMetadata({});
        mockRequest.user = {
          id: 2,
          username: 'testuser',
          isSuperAdmin: false,
        };

        // Act & Assert
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(mockContext)).rejects.toThrow('接口未配置访问权限');
      });

      it('当权限要求为空数组时，应该拒绝访问', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: [] });
        mockRequest.user = {
          id: 2,
          username: 'testuser',
          isSuperAdmin: false,
        };

        // Act & Assert
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(mockContext)).rejects.toThrow('接口未配置访问权限');
      });
    });

    describe('用户未登录', () => {
      it('应该抛出 ForbiddenException', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:read'] });
        mockRequest.user = null;

        // Act & Assert
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(mockContext)).rejects.toThrow('未登录或登录已过期');
      });
    });

    describe('超级管理员', () => {
      it('应该直接放行（isSuperAdmin = true）', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });
        mockRequest.user = {
          id: 1,
          username: 'admin',
          isSuperAdmin: true,
        };

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('超级管理员'));
        // 不应该查询数据库
        expect(permissionRepository.createQueryBuilder).not.toHaveBeenCalled();
      });

      it('应该直接放行（roleCode = super_admin）', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });
        mockRequest.user = {
          id: 1,
          username: 'admin',
          roleCode: 'super_admin',
        };

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        // 不应该查询数据库
        expect(permissionRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('普通用户权限检查', () => {
      beforeEach(() => {
        mockRequest.user = {
          id: 2,
          username: 'testuser',
          isSuperAdmin: false,
        };
      });

      it('当用户拥有所需权限时，应该放行', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:read'] });

        // Mock 缓存未命中，需要查询数据库
        cacheService.getOrSet.mockImplementation(async (key, fn) => {
          return await fn();
        });

        // Mock 数据库查询返回用户权限
        const mockPermissions = [{ code: 'user:read' }, { code: 'user:create' }];
        mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
        expect(permissionRepository.createQueryBuilder).toHaveBeenCalled();
      });

      it('当用户缺少所需权限时，应该拒绝访问', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });

        // Mock 数据库查询
        cacheService.getOrSet.mockImplementation(async (key, fn) => {
          return await fn();
        });

        // 用户只有 read 和 create 权限，没有 delete 权限
        const mockPermissions = [{ code: 'user:read' }, { code: 'user:create' }];
        mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

        // Act & Assert
        await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
        await expect(guard.canActivate(mockContext)).rejects.toThrow('缺少必要的权限: user:delete');
      });

      it('OR逻辑：用户拥有任一所需权限即可通过', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete', 'user:manage'] });

        cacheService.getOrSet.mockImplementation(async (key, fn) => {
          return await fn();
        });

        // 用户有 manage 权限（虽然没有 delete 权限）
        const mockPermissions = [{ code: 'user:read' }, { code: 'user:manage' }];
        mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true); // 有任一权限即可通过
      });
    });

    describe('通配符权限', () => {
      beforeEach(() => {
        mockRequest.user = {
          id: 3,
          username: 'poweruser',
          isSuperAdmin: false,
        };

        cacheService.getOrSet.mockImplementation(async (key, fn) => {
          return await fn();
        });
      });

      it('用户拥有 * 通配符权限时，应该匹配所有权限', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });

        const mockPermissions = [{ code: '*' }];
        mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });

      it('用户拥有 user:* 权限时，应该匹配 user 模块的所有操作', async () => {
        // Arrange
        mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });

        const mockPermissions = [{ code: 'user:*' }];
        mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

        // Act
        const result = await guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });
    });
  });

  describe('getUserPermissions - QueryBuilder字段名验证', () => {
    it('应该使用正确的字段名（isActive 而非 is_active）', async () => {
      // Arrange
      const userId = 123;

      // Mock 缓存未命中
      cacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });

      const mockResult = [{ code: 'user:read' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      // Act
      await guard['getUserPermissions'](userId);

      // Assert
      // 验证 createQueryBuilder 被调用
      expect(permissionRepository.createQueryBuilder).toHaveBeenCalledWith('p');

      // 验证 where 条件使用了正确的参数
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('ur.user_id = :userId', { userId });

      // ✅ 关键验证：andWhere 使用了正确的字段名 isActive（TypeORM会自动处理映射）
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.isActive = :isActive', {
        isActive: true,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('r.isActive = :isActive', {
        isActive: true,
      });

      // 验证 getRawMany 被调用
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('应该正确处理有角色和权限的用户', async () => {
      // Arrange
      const userId = 456;

      cacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });

      const mockPermissions = [
        { code: 'user:read' },
        { code: 'user:create' },
        { code: 'role:read' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockPermissions);

      // Act
      const result = await guard['getUserPermissions'](userId);

      // Assert
      expect(result).toEqual(['user:read', 'user:create', 'role:read']);
      expect(permissionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('应该正确处理没有权限的用户（空结果）', async () => {
      // Arrange
      const userId = 789;

      cacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });

      // 用户没有任何角色或权限
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      const result = await guard['getUserPermissions'](userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该处理数据库查询错误', async () => {
      // Arrange
      const userId = 999;

      cacheService.getOrSet.mockImplementation(async (key, fn) => {
        return await fn();
      });

      // Mock 数据库错误
      mockQueryBuilder.getRawMany.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await guard['getUserPermissions'](userId);

      // Assert
      expect(result).toEqual([]); // 错误时返回空数组
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('权限查询失败'),
        expect.any(String),
      );
    });
  });

  describe('缓存机制', () => {
    it('应该使用缓存的权限数据', async () => {
      // Arrange
      const userId = 111;
      const cachedPermissions = ['user:read', 'user:create'];

      // Mock 缓存命中
      cacheService.getOrSet.mockResolvedValue(cachedPermissions);

      // Act
      const result = await guard['getUserPermissions'](userId);

      // Assert
      expect(result).toEqual(cachedPermissions);
      // 缓存命中时不应该查询数据库
      expect(permissionRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('应该使用正确的缓存键', async () => {
      // Arrange
      const userId = 222;

      cacheService.getOrSet.mockImplementation(async (key, fn) => {
        expect(key).toBe(CACHE_KEYS.USER_PERMISSIONS(userId));
        return await fn();
      });

      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      // Act
      await guard['getUserPermissions'](userId);

      // Assert
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        CACHE_KEYS.USER_PERMISSIONS(userId),
        expect.any(Function),
        expect.any(Number),
      );
    });
  });

  describe('clearUserPermissionsCache', () => {
    it('应该清除指定用户的权限缓存', async () => {
      // Arrange
      const userId = 333;

      // Act
      await guard.clearUserPermissionsCache(userId);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(CACHE_KEYS.USER_PERMISSIONS(userId));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('清除用户权限缓存完成'));
    });
  });
});
