import { Request } from 'express';
import { ValidatedApiApp } from '~/modules/api-auth/services/api-auth.service';

/**
 * 带有API应用信息的请求对象
 * Passport 将验证后的 API 应用信息注入到 req.user；不额外引入第二套 app 上下文。
 */
export interface ApiRequest extends Request {
  user: ValidatedApiApp;
}
