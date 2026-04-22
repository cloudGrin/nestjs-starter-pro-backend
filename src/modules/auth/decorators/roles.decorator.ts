import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const ROLES_KEY = 'roles';

export enum RoleMode {
  AND = 'and', // 需要所有角色
  OR = 'or', // 需要其中一个角色
}

/**
 * 角色装饰器
 * @param roles 角色编码列表
 * @param mode 角色模式（AND: 全部满足, OR: 满足其一）
 */
export const Roles = (roles: string[], mode: RoleMode = RoleMode.OR) => {
  return applyDecorators(
    SetMetadata(ROLES_KEY, { roles, mode }),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: '未授权' }),
    ApiForbiddenResponse({ description: '角色权限不足' }),
  );
};

/**
 * 需要所有角色
 */
export const RequireAllRoles = (...roles: string[]) => {
  return Roles(roles, RoleMode.AND);
};

/**
 * 需要任意一个角色
 */
export const RequireAnyRole = (...roles: string[]) => {
  return Roles(roles, RoleMode.OR);
};

/**
 * 管理员角色
 */
export const AdminOnly = () => {
  return RequireAnyRole('admin', 'super_admin');
};
