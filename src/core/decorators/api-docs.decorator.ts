import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const errorResponse = (status: number, description: string) =>
  ApiResponse({
    status,
    description,
    schema: {
      properties: {
        success: {
          type: 'boolean',
          example: false,
        },
        statusCode: {
          type: 'number',
          example: status,
        },
        message: {
          type: 'string',
          example: description,
        },
        error: {
          type: 'string',
          example: 'Error Type',
        },
        timestamp: {
          type: 'string',
          example: new Date().toISOString(),
        },
        path: {
          type: 'string',
          example: '/api/v1/resource',
        },
        method: {
          type: 'string',
          example: 'GET',
        },
      },
    },
  });

/**
 * 通用错误响应装饰器组合
 * 包含常见的HTTP错误状态码文档
 */
export const ApiCommonResponses = () => {
  return applyDecorators(
    errorResponse(400, 'Bad Request - 参数验证失败'),
    errorResponse(401, 'Unauthorized - 用户未认证或token已过期'),
    errorResponse(403, 'Forbidden - 用户无权限访问该资源'),
    errorResponse(404, 'Not Found - 请求的资源不存在'),
    errorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 认证接口通用错误响应
 * 用于需要认证的接口
 */
export const ApiAuthResponses = () => {
  return applyDecorators(
    errorResponse(401, 'Unauthorized - 用户未认证或token已过期'),
    errorResponse(403, 'Forbidden - 用户无权限访问该资源'),
    errorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 公开接口通用错误响应
 * 用于不需要认证的公开接口
 */
export const ApiPublicResponses = () => {
  return applyDecorators(
    errorResponse(400, 'Bad Request - 参数验证失败'),
    errorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};
