import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_KEY_SCOPES_KEY, ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: jest.Mocked<Reflector>;
  let parentCanActivateSpy: jest.SpyInstance;
  let mockContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new ApiKeyGuard(reflector);
    parentCanActivateSpy = jest
      .spyOn(Object.getPrototypeOf(ApiKeyGuard.prototype), 'canActivate')
      .mockResolvedValue(true);

    mockRequest = {
      user: {
        id: 1,
        name: 'test-app',
        scopes: ['read:users'],
      },
    };

    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  afterEach(() => {
    parentCanActivateSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('应该先执行 API Key 认证', async () => {
    reflector.getAllAndOverride.mockReturnValue(['read:users']);

    await guard.canActivate(mockContext);

    expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
  });

  it('当接口未声明 API scope 时，应该拒绝访问', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow('接口未配置API访问权限');
  });

  it('当 API 应用拥有任一所需 scope 时，应该放行', async () => {
    reflector.getAllAndOverride.mockReturnValue(['read:users']);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(API_KEY_SCOPES_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
  });
});
