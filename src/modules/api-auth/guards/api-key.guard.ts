import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiAuthService, ValidatedApiApp } from '../services/api-auth.service';

export const API_KEY_SCOPES_KEY = 'api-key-scopes';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  constructor(
    private reflector: Reflector,
    private readonly apiAuthService: ApiAuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 首先执行API Key认证
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // 检查权限范围
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(API_KEY_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredScopes || requiredScopes.length === 0) {
      await this.recordRejectedAccess(context);
      throw new UnauthorizedException('接口未配置API访问权限');
    }

    const request = context.switchToHttp().getRequest();
    const app = request.user; // API应用信息

    if (!app.scopes || app.scopes.length === 0) {
      await this.recordRejectedAccess(context);
      throw new UnauthorizedException('该API密钥没有任何权限');
    }

    // 检查是否有所需的scope
    const hasScope = requiredScopes.some((scope) => app.scopes.includes(scope));

    if (!hasScope) {
      await this.recordRejectedAccess(context);
      throw new UnauthorizedException(`需要以下权限之一: ${requiredScopes.join(', ')}`);
    }

    return true;
  }

  private async recordRejectedAccess(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest<Request & { user?: ValidatedApiApp }>();
    const app = request.user;

    if (!app?.id) {
      return;
    }

    await this.apiAuthService
      .recordAccessLog({
        appId: app.id,
        keyId: app.keyId,
        keyName: app.keyName,
        keyPrefix: app.keyPrefix,
        keySuffix: app.keySuffix,
        method: request.method,
        path: (request.originalUrl || request.url || '').slice(0, 500),
        statusCode: 401,
        durationMs: 0,
        ip: this.getRequestIp(request),
        userAgent: this.getHeaderValue(request.headers['user-agent']),
      })
      .catch(() => undefined);
  }

  private getRequestIp(request: Request): string | undefined {
    const forwardedFor = this.getHeaderValue(request.headers['x-forwarded-for']);
    return (forwardedFor?.split(',')[0]?.trim() || request.ip || undefined)?.slice(0, 64);
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value?.slice(0, 500);
  }
}
