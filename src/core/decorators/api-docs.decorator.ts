import { applyDecorators, Type } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from './api-response.decorator';

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

/**
 * 创建资源接口文档
 */
export const ApiCreateResponse = <TModel extends Type<any>>(
  model: TModel,
  summary: string,
  description = '创建成功',
) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiSuccessResponse(model, false, description),
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(409, 'Conflict - 资源已存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 更新资源接口文档
 */
export const ApiUpdateResponse = <TModel extends Type<any>>(
  model: TModel,
  summary: string,
  description = '更新成功',
) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({ name: 'id', description: '资源ID', type: Number }),
    ApiSuccessResponse(model, false, description),
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(404, 'Not Found - 资源不存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 删除资源接口文档
 */
export const ApiDeleteResponse = (summary: string, description = '删除成功') => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({ name: 'id', description: '资源ID', type: Number }),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(404, 'Not Found - 资源不存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 查询单个资源接口文档
 */
export const ApiGetOneResponse = <TModel extends Type<any>>(
  model: TModel,
  summary: string,
  description = '查询成功',
) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({ name: 'id', description: '资源ID', type: Number }),
    ApiSuccessResponse(model, false, description),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(404, 'Not Found - 资源不存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 查询资源列表接口文档（分页）
 */
export const ApiGetManyResponse = <TModel extends Type<any>>(
  model: TModel,
  summary: string,
  description = '查询成功',
) => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiPaginatedResponse(model, description),
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 文件上传接口文档
 */
export const ApiFileUploadResponse = (summary: string, description = '文件上传成功') => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiErrorResponse(400, 'Bad Request - 文件验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(413, 'Payload Too Large - 文件大小超出限制'),
    ApiErrorResponse(415, 'Unsupported Media Type - 不支持的文件类型'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};

/**
 * 批量操作接口文档
 */
export const ApiBatchOperationResponse = (summary: string, description = '批量操作成功') => {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiErrorResponse(400, 'Bad Request - 参数验证失败'),
    ApiErrorResponse(401, 'Unauthorized - 用户未认证'),
    ApiErrorResponse(403, 'Forbidden - 用户无权限'),
    ApiErrorResponse(404, 'Not Found - 部分资源不存在'),
    ApiErrorResponse(500, 'Internal Server Error - 服务器内部错误'),
  );
};
