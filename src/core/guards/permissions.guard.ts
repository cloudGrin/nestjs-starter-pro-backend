import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { LoggerService } from '~/shared/logger/logger.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_AUTHENTICATED_KEY } from '../decorators/allow-authenticated.decorator';
import { UserService } from '~/modules/user/services/user.service';

/**
 * 权限守卫（简化版 - 轻量级实现）
 * 功能：
 * 1. 从缓存/数据库获取用户权限
 * 2. OR 逻辑：用户拥有任一所需权限即可通过
 * 3. 支持通配符权限匹配
 * 4. 详细的错误提示和日志
 *
 * 已移除的企业级功能：
 * - ❌ 权限组（permission groups）
 * - ❌ 权限继承（parent/child permissions）
 * - ❌ AND/OR 逻辑选择（统一使用 OR 逻辑）
 * - ❌ 数据权限范围（data scope）
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录或登录已过期');
    }

    const allowAuthenticated = this.reflector.getAllAndOverride<boolean>(ALLOW_AUTHENTICATED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (allowAuthenticated) {
      this.logger.debug(
        `已登录即可访问接口，跳过业务权限检查 method=${request.method}, url=${request.url}, userId=${user.id}`,
      );
      return true;
    }

    // 1. 获取接口所需的权限列表
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(
      `权限检查开始 method=${request.method}, url=${request.url}, required=${JSON.stringify(requiredPermissions || [])}`,
    );

    // 默认拒绝：非公开接口必须显式声明权限，避免新增接口遗漏鉴权。
    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.warn(`接口未声明权限，已拒绝访问 method=${request.method}, url=${request.url}`);
      throw new ForbiddenException('接口未配置访问权限');
    }

    // 3. 超级管理员自动拥有所有权限
    this.logger.debug(
      `检查超级管理员标识 userId=${user.id}, username=${user.username}, isSuperAdmin=${user.isSuperAdmin}, roleCode=${user.roleCode}`,
    );

    if (user.isSuperAdmin || user.roleCode === 'super_admin') {
      this.logger.debug(`超级管理员 ${user.username}(${user.id}) 访问 ${request.url}`);
      return true;
    }

    // 4. 获取用户的所有权限
    const userPermissions = await this.userService.getUserPermissions(user.id);

    // 5. 检查通配符权限
    if (userPermissions.includes('*') || userPermissions.includes('*:*:*')) {
      this.logger.debug(`用户 ${user.username}(${user.id}) 拥有通配符权限，访问 ${request.url}`);
      return true;
    }

    // 6. 检查权限（OR 逻辑：用户拥有任一所需权限即可通过）
    const hasPermission = this.checkPermissions(requiredPermissions, userPermissions);

    if (!hasPermission) {
      const permissionText = requiredPermissions.join(' 或 ');

      this.logger.debug(
        `权限校验失败详情 userId=${user.id}, required=${JSON.stringify(requiredPermissions)}, userPermissions=${JSON.stringify(userPermissions)}`,
      );

      this.logger.warn(
        `用户 ${user.username}(${user.id}) 缺少权限: ${permissionText}，访问 ${request.url} 被拒绝`,
      );

      throw new ForbiddenException(`缺少必要的权限: ${permissionText}`);
    }

    this.logger.debug(`用户 ${user.username}(${user.id}) 权限检查通过，访问 ${request.url}`);

    return true;
  }

  /**
   * 检查权限（简化版：只支持 OR 逻辑）
   *
   * OR 逻辑：用户拥有任一所需权限即可通过
   */
  private checkPermissions(requiredPermissions: string[], userPermissions: string[]): boolean {
    this.logger.debug(
      `开始权限匹配 逻辑=OR, required=${JSON.stringify(requiredPermissions)}, userPermissionCount=${userPermissions.length}`,
    );

    const evaluations = requiredPermissions.map((required) => ({
      required,
      matched: this.hasPermission(required, userPermissions),
    }));

    // OR 逻辑：拥有任一权限即可
    const result = evaluations.some((item) => item.matched);

    this.logger.debug(
      `权限匹配完成 逻辑=OR, result=${result}, 详情=${JSON.stringify(evaluations)}`,
    );

    return result;
  }

  /**
   * 检查单个权限（支持通配符匹配）
   */
  private hasPermission(required: string, userPermissions: string[]): boolean {
    this.logger.debug(
      `检查单个权限 required=${required}, userPermissionCount=${userPermissions.length}`,
    );

    // 精确匹配
    if (userPermissions.includes(required)) {
      this.logger.debug(`权限精确匹配成功 required=${required}`);
      return true;
    }

    // 通配符匹配
    // 如: 用户有 user:* 权限，则可以匹配 user:create, user:update 等
    const requiredParts = required.split(':');

    for (const userPerm of userPermissions) {
      const userParts = userPerm.split(':');

      // 检查每一段是否匹配
      let match = true;
      for (let i = 0; i < Math.max(requiredParts.length, userParts.length); i++) {
        const requiredPart = requiredParts[i];
        const userPart = userParts[i];

        if (userPart === '*') {
          // 用户权限使用通配符，匹配
          continue;
        }

        if (requiredPart !== userPart) {
          // 不匹配
          match = false;
          break;
        }
      }

      if (match) {
        this.logger.debug(`权限通配符匹配成功 required=${required}, userPerm=${userPerm}`);
        return true;
      }
    }

    this.logger.debug(`权限匹配失败 required=${required}`);
    return false;
  }
}
