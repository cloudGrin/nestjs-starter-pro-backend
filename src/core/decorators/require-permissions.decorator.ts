import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限检查装饰器（简化版）
 * 要求用户拥有指定的权限才能访问接口
 *
 * 逻辑：OR（用户拥有任一权限即可通过）
 *
 * @param permissions 权限代码（可变参数）
 *
 * @example
 * ```typescript
 * // 需要 user:create 或 user:update 权限之一
 * @RequirePermissions('user:create', 'user:update')
 * @Post()
 * createUser(@Body() dto: CreateUserDto) {
 *   return this.userService.create(dto);
 * }
 *
 * // 管理员权限
 * @RequirePermissions('admin')
 * @Get('sensitive-data')
 * getSensitiveData() {
 *   return this.userService.getSensitiveData();
 * }
 *
 * // 支持通配符
 * @RequirePermissions('user:*')
 * @Get('users')
 * getUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export function RequirePermissions(...permissions: string[]): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
  };
}
