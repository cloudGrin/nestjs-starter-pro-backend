import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * API响应示例装饰器
 * 提供成功和错误响应的详细示例
 */

/**
 * 登录响应示例
 */
export const ApiLoginExample = () => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '登录成功',
      schema: {
        example: {
          success: true,
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'refresh_token_example',
            tokenType: 'Bearer',
            expiresIn: 3600,
            user: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              roles: [
                {
                  id: 1,
                  code: 'admin',
                  name: '管理员',
                },
              ],
              permissions: ['user:read', 'user:create', 'user:update', 'user:delete'],
            },
          },
          message: '登录成功',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/auth/login',
          method: 'POST',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '参数验证失败',
      schema: {
        example: {
          success: false,
          statusCode: 400,
          message: '参数验证失败',
          error: 'Bad Request',
          details: [
            {
              field: 'password',
              message: '密码长度至少为6位',
            },
          ],
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/auth/login',
          method: 'POST',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '认证失败',
      schema: {
        example: {
          success: false,
          statusCode: 401,
          message: '用户名或密码错误',
          error: 'Unauthorized',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/auth/login',
          method: 'POST',
        },
      },
    }),
  );
};

/**
 * 创建用户响应示例
 */
export const ApiCreateUserExample = () => {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: '创建成功',
      schema: {
        example: {
          success: true,
          data: {
            id: 1,
            username: 'johndoe',
            email: 'john@example.com',
            realName: 'John Doe',
            nickname: 'Johnny',
            phone: '+8613800138000',
            gender: 'MALE',
            birthday: '1990-01-01',
            address: 'Beijing, China',
            bio: 'Software developer with 10 years experience',
            avatar: 'https://example.com/avatar.jpg',
            status: 'ACTIVE',
            roles: [
              {
                id: 2,
                code: 'user',
                name: '普通用户',
                description: '系统普通用户',
              },
            ],
            department: {
              id: 1,
              name: '技术部',
              code: 'tech',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          message: '创建成功',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/users',
          method: 'POST',
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: '用户名或邮箱已存在',
      schema: {
        example: {
          success: false,
          statusCode: 409,
          message: '用户名已存在',
          error: 'Conflict',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/users',
          method: 'POST',
        },
      },
    }),
  );
};

/**
 * 分页查询响应示例
 */
export const ApiPaginationExample = () => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '查询成功',
      schema: {
        example: {
          success: true,
          data: {
            items: [
              {
                id: 1,
                username: 'admin',
                email: 'admin@example.com',
                realName: '管理员',
                status: 'ACTIVE',
                createdAt: '2024-01-01T00:00:00.000Z',
              },
              {
                id: 2,
                username: 'johndoe',
                email: 'john@example.com',
                realName: 'John Doe',
                status: 'ACTIVE',
                createdAt: '2024-01-02T00:00:00.000Z',
              },
            ],
            meta: {
              totalItems: 100,
              itemCount: 10,
              itemsPerPage: 10,
              totalPages: 10,
              currentPage: 1,
            },
          },
          message: '查询成功',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/users',
          method: 'GET',
        },
      },
    }),
  );
};

/**
 * 文件上传响应示例
 */
export const ApiFileUploadExample = () => {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: '文件上传成功',
      schema: {
        example: {
          success: true,
          data: {
            id: 1,
            originalName: 'document.pdf',
            filename: 'upload_1234567890_document.pdf',
            path: 'uploads/2024/01/01/upload_1234567890_document.pdf',
            size: 1024576,
            mimeType: 'application/pdf',
            hash: 'sha256:abcdef1234567890',
            isPublic: false,
            module: 'user-documents',
            tags: 'invoice,contract',
            remark: '用户合同文件',
            uploaderId: 1,
            uploader: {
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          message: '文件上传成功',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/files/upload',
          method: 'POST',
        },
      },
    }),
    ApiResponse({
      status: 413,
      description: '文件大小超出限制',
      schema: {
        example: {
          success: false,
          statusCode: 413,
          message: '文件大小超出限制（最大100MB）',
          error: 'Payload Too Large',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/files/upload',
          method: 'POST',
        },
      },
    }),
    ApiResponse({
      status: 415,
      description: '不支持的文件类型',
      schema: {
        example: {
          success: false,
          statusCode: 415,
          message: '不支持的文件类型',
          error: 'Unsupported Media Type',
          allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/files/upload',
          method: 'POST',
        },
      },
    }),
  );
};

/**
 * 权限错误响应示例
 */
export const ApiPermissionErrorExample = () => {
  return ApiResponse({
    status: 403,
    description: '权限不足',
    schema: {
      example: {
        success: false,
        statusCode: 403,
        message: '您没有权限执行此操作',
        error: 'Forbidden',
        requiredPermissions: ['user:create'],
        userPermissions: ['user:read'],
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/v1/users',
        method: 'POST',
      },
    },
  });
};

/**
 * 删除操作响应示例
 */
export const ApiDeleteExample = () => {
  return applyDecorators(
    ApiResponse({
      status: 204,
      description: '删除成功（无内容返回）',
    }),
    ApiResponse({
      status: 404,
      description: '资源不存在',
      schema: {
        example: {
          success: false,
          statusCode: 404,
          message: '用户不存在',
          error: 'Not Found',
          resourceType: 'User',
          resourceId: 999,
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/api/v1/users/999',
          method: 'DELETE',
        },
      },
    }),
  );
};
