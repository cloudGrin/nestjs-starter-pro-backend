import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { LoggerService } from '~/shared/logger/logger.service';
import { IS_PUBLIC_KEY } from '~/core/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(JwtAuthGuard.name);
  }

  canActivate(context: ExecutionContext) {
    // 检查是否是公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('检测到公开接口，跳过JWT校验');
      return true;
    }

    this.logger.debug('执行JWT认证校验');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.warn(
        `JWT认证失败: error=${err?.message || info?.message || 'unknown'}, user=${user ? '存在' : '无'}`,
      );
      throw err || new UnauthorizedException('未授权访问');
    }
    this.logger.debug(`JWT认证通过 userId=${user?.id}, username=${user?.username}`);
    return user;
  }
}
