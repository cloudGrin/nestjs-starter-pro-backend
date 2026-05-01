import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ApiAccessLogInterceptor } from './api-access-log.interceptor';
import { ApiAuthService } from '../services/api-auth.service';

describe('ApiAccessLogInterceptor', () => {
  const createContext = (overrides: Record<string, unknown> = {}) => {
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/open/users?page=1',
      url: '/open/users?page=1',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'curl/8.0',
      },
      user: {
        id: 1,
        name: 'Test App',
        keyId: 2,
        keyName: 'Production Key',
        keyPrefix: 'sk_live',
        keySuffix: 'abcd',
        scopes: ['read:users'],
        type: 'api-app',
      },
      ...overrides,
    };
    const response = { statusCode: 200 };

    return {
      request,
      response,
      context: {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
      } as ExecutionContext,
    };
  };

  it('records successful open API requests', async () => {
    const apiAuthService = {
      recordAccessLog: jest.fn().mockResolvedValue(undefined),
    } as unknown as ApiAuthService;
    const interceptor = new ApiAccessLogInterceptor(apiAuthService);
    const { context } = createContext();
    const next = { handle: () => of({ ok: true }) } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      ok: true,
    });

    expect(apiAuthService.recordAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 1,
        keyId: 2,
        keyName: 'Production Key',
        keyPrefix: 'sk_live',
        keySuffix: 'abcd',
        method: 'GET',
        path: '/api/v1/open/users?page=1',
        statusCode: 200,
        ip: '127.0.0.1',
        userAgent: 'curl/8.0',
      }),
    );
  });

  it('records rejected open API requests with the thrown status code', async () => {
    const apiAuthService = {
      recordAccessLog: jest.fn().mockResolvedValue(undefined),
    } as unknown as ApiAuthService;
    const interceptor = new ApiAccessLogInterceptor(apiAuthService);
    const { context } = createContext();
    const next = {
      handle: () => throwError(() => new UnauthorizedException('需要 read:users')),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toThrow(
      UnauthorizedException,
    );

    expect(apiAuthService.recordAccessLog).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 1,
        keyId: 2,
        statusCode: 401,
      }),
    );
  });
});
