import { SetMetadata } from '@nestjs/common';
import { API_KEY_SCOPES_KEY } from '../guards/api-key.guard';

/**
 * API权限范围装饰器
 * @param scopes - 需要的权限范围
 *
 * @example
 * ```typescript
 * @RequireApiScopes('read:users')
 * async getUsers() { }
 *
 * @RequireApiScopes('write:orders', 'read:orders')
 * async updateOrder() { }
 * ```
 */
export const RequireApiScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES_KEY, scopes);
