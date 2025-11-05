import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '~/shared/logger/logger.service';
import { ROLES_KEY, RoleMode } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(RolesGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<{
      roles: string[];
      mode: RoleMode;
    }>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles) {
      this.logger.debug('当前接口未配置角色要求，直接放行');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      this.logger.debug(`角色守卫检测到无角色信息 user=${JSON.stringify(user || {})}`);
      throw new ForbiddenException('用户未认证或无角色信息');
    }

    const { roles, mode } = requiredRoles;
    this.logger.debug(
      `角色守卫开始校验 userId=${user.id}, username=${user.username}, 拥有角色=${JSON.stringify(user.roles)}, 需要角色=${JSON.stringify(roles)}, 模式=${mode}`,
    );

    let hasRole = false;

    if (mode === RoleMode.ALL) {
      // 用户必须拥有所有指定的角色
      hasRole = roles.every((role) => user.roles.includes(role));
    } else {
      // 用户只需要拥有其中一个角色
      hasRole = roles.some((role) => user.roles.includes(role));
    }

    if (!hasRole) {
      this.logger.warn(
        `角色权限不足 userId=${user.id}, username=${user.username}, required=${JSON.stringify(roles)}, mode=${mode}`,
      );
      throw new ForbiddenException('角色权限不足');
    }

    this.logger.debug(`角色校验通过 userId=${user.id}, username=${user.username}, mode=${mode}`);
    return true;
  }
}
