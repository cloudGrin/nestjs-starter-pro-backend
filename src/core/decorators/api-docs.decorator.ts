import { applyDecorators } from '@nestjs/common';
import { ApiErrorResponse } from './api-response.decorator';

/**
 * 通用错误响应装饰器组合
 * 包含常见的HTTP错误状态码文档
 */
export const ApiCommonResponses = () => {
  return applyDecorators(
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证或token已过期'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限访问该资源'),
    ApiErrorResponse(404, 'Not Found - 请求的资源不存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 认证接口通用错误响应
 * 用于需要认证的接口
 */
export const ApiAuthResponses = () => {
  return applyDecorators(
    ApiErrorResponse(401, 'Unauthorized - 用户未认证或token已过期'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限访问该资源'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 公开接口通用错误响应
 * 用于不需要认证的公开接口
 */
export const ApiPublicResponses = () => {
  return applyDecorators(
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};
