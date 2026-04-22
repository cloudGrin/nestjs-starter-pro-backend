/**
 * 装饰器统一导出
 */

export * from './public.decorator';
export * from './allow-authenticated.decorator';
export * from './require-permissions.decorator';
export * from './api-response.decorator';
export * from './api-docs.decorator';
export * from './api-example.decorator';

// 重新导出auth模块的装饰器，方便使用
export { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
