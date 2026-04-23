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
