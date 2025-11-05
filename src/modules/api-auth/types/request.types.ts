import { Request } from 'express';
import { UserEntity } from '~/modules/user/entities/user.entity';

/**
 * 带有JWT认证用户信息的请求对象
 * JwtAuthGuard会将验证后的用户信息注入到req.user
 */
export interface AuthenticatedRequest extends Request {
  user: UserEntity;
}
