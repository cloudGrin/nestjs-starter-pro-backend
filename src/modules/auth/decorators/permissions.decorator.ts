import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '~/core/guards/permissions.guard';

export const PERMISSIONS_KEY = 'permissions';

export enum PermissionMode {
  AND = 'and', // 需要所有权限
  OR = 'or', // 需要其中一个权限
  ALL = 'and', // 同 AND
  ANY = 'or', // 同 OR
}

/**
 * 权限装饰器
 * @param permissions 权限编码列表
 * @param mode 权限模式（AND: 全部满足, OR: 满足其一）
 */
export const Permissions = (permissions: string[], mode: PermissionMode = PermissionMode.ALL) => {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, { permissions, mode }),
    UseGuards(JwtAuthGuard, PermissionsGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: '未授权' }),
    ApiForbiddenResponse({ description: '权限不足' }),
  );
};

/**
 * 需要所有权限
 */
export const RequireAllPermissions = (...permissions: string[]) => {
  return Permissions(permissions, PermissionMode.ALL);
};

/**
 * 需要任意一个权限
 */
export const RequireAnyPermission = (...permissions: string[]) => {
  return Permissions(permissions, PermissionMode.ANY);
};
