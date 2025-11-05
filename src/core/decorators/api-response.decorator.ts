import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

/**
 * 自定义 API 响应装饰器
 * 用于 Swagger 文档中定义统一的响应格式
 */
export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  isArray = false,
  description = 'Success',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description,
      schema: {
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: isArray
            ? {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              }
            : {
                $ref: getSchemaPath(model),
              },
          message: {
            type: 'string',
            example: 'Operation successful',
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
    }),
  );
};

/**
 * 分页响应装饰器
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
  description = 'Success',
) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: 200,
      description,
      schema: {
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  totalItems: {
                    type: 'number',
                    example: 100,
                  },
                  itemCount: {
                    type: 'number',
                    example: 10,
                  },
                  itemsPerPage: {
                    type: 'number',
                    example: 10,
                  },
                  totalPages: {
                    type: 'number',
                    example: 10,
                  },
                  currentPage: {
                    type: 'number',
                    example: 1,
                  },
                },
              },
            },
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
    }),
  );
};

/**
 * 错误响应装饰器
 */
export const ApiErrorResponse = (status: number, description: string) => {
  return ApiResponse({
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
};
