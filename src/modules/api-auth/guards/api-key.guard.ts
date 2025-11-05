import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

export const API_KEY_SCOPES_KEY = 'api-key-scopes';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 首先执行API Key认证
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // 检查权限范围
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      API_KEY_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true; // 没有特定的scope要求
    }

    const request = context.switchToHttp().getRequest();
    const app = request.user; // API应用信息

    if (!app.scopes || app.scopes.length === 0) {
      throw new UnauthorizedException('该API密钥没有任何权限');
    }

    // 检查是否有所需的scope
    const hasScope = requiredScopes.some(scope =>
      app.scopes.includes(scope) || app.scopes.includes('*')
    );

    if (!hasScope) {
      throw new UnauthorizedException(
        `需要以下权限之一: ${requiredScopes.join(', ')}`
      );
    }

    return true;
  }
}