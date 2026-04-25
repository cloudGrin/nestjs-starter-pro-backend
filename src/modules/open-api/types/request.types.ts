import { Request } from 'express';
import { ValidatedApiApp } from '~/modules/api-auth/services/api-auth.service';

/**
 * 带有API应用信息的请求对象
 * ApiKeyGuard会将验证后的应用信息注入到req.user
 */
export interface ApiRequest extends Request {
  user: ValidatedApiApp;
}
