import { SetMetadata } from '@nestjs/common';

/**
 * 公开接口装饰器
 * 标记为公开的接口不需要JWT认证
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-data')
 * getPublicData() {
 *   return { data: 'public' };
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
