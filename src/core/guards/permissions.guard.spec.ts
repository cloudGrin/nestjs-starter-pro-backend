import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { LoggerService } from '~/shared/logger/logger.service';
import { UserService } from '~/modules/user/services/user.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserPermissions: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
    reflector = module.get(Reflector);
    userService = module.get(UserService);
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

    const mockMetadata = (metadata: Record<string, unknown>) => {
      reflector.getAllAndOverride.mockImplementation((key: string) => metadata[key]);
    };

    it('当接口标记为公开时，应该直接放行', async () => {
      mockMetadata({ [IS_PUBLIC_KEY]: true });

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(userService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('当接口标记为已登录即可访问且用户已登录时，应该直接放行', async () => {
      mockMetadata({ [ALLOW_AUTHENTICATED_KEY]: true });
      mockRequest.user = {
        id: 2,
        username: 'testuser',
        isSuperAdmin: false,
      };

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(userService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('当已登录用户访问未声明权限的接口时，应该拒绝访问', async () => {
      mockMetadata({});
      mockRequest.user = {
        id: 2,
        username: 'testuser',
        isSuperAdmin: false,
      };

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('接口未配置访问权限');
    });

    it('当用户未登录时，应该拒绝访问', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:read'] });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('未登录或登录已过期');
    });

    it('超级管理员应该直接放行', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });
      mockRequest.user = {
        id: 1,
        username: 'admin',
        isSuperAdmin: true,
      };

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(userService.getUserPermissions).not.toHaveBeenCalled();
    });

    it('普通用户应该通过 UserService 获取权限', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:read'] });
      mockRequest.user = {
        id: 2,
        username: 'testuser',
        isSuperAdmin: false,
      };
      userService.getUserPermissions.mockResolvedValue(['user:read', 'user:create']);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
      expect(userService.getUserPermissions).toHaveBeenCalledWith(2);
    });

    it('OR逻辑：拥有任一权限即可通过', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:delete', 'user:manage'] });
      mockRequest.user = {
        id: 2,
        username: 'testuser',
        isSuperAdmin: false,
      };
      userService.getUserPermissions.mockResolvedValue(['user:manage']);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });

    it('缺少所需权限时应该拒绝访问', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });
      mockRequest.user = {
        id: 2,
        username: 'testuser',
        isSuperAdmin: false,
      };
      userService.getUserPermissions.mockResolvedValue(['user:read', 'user:create']);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow('缺少必要的权限: user:delete');
    });

    it('用户拥有通配符权限时应该放行', async () => {
      mockMetadata({ [PERMISSIONS_KEY]: ['user:delete'] });
      mockRequest.user = {
        id: 3,
        username: 'poweruser',
        isSuperAdmin: false,
      };
      userService.getUserPermissions.mockResolvedValue(['user:*']);

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });
  });
});
