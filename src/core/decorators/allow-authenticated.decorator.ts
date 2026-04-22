import { SetMetadata } from '@nestjs/common';

/**
 * 已登录即可访问的接口装饰器。
 *
 * 与 @Public() 不同，该装饰器仍然要求 JWT 认证通过，只跳过业务权限检查。
 * 适用于当前用户资料、登出、当前用户菜单等登录后基础能力。
 */
export const ALLOW_AUTHENTICATED_KEY = 'allowAuthenticated';
export const AllowAuthenticated = () => SetMetadata(ALLOW_AUTHENTICATED_KEY, true);
