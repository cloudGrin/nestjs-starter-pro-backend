import {
  applyDecorators,
  Controller,
  SetMetadata,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '~/core/decorators/public.decorator';
import {
  OPEN_API_CONTROLLER_KEY,
  OPEN_API_ENDPOINT_KEY,
  OpenApiEndpointMetadata,
} from '../constants/api-scopes.constant';
import { API_KEY_SCOPES_KEY, ApiKeyGuard } from '../guards/api-key.guard';
import { ApiAccessLogInterceptor } from '../interceptors/api-access-log.interceptor';

/**
 * API权限范围装饰器
 * @param scopes - 需要的权限范围
 *
 * @example
 * ```typescript
 * @RequireApiScopes('read:users')
 * async getUsers() { }
 *
 * @RequireApiScopes('write:orders', 'read:orders')
 * async updateOrder() { }
 * ```
 */
export const RequireApiScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES_KEY, scopes);

export const OpenApiResourceController = (path: string) =>
  applyDecorators(
    Controller(path),
    SetMetadata(OPEN_API_CONTROLLER_KEY, true),
    UseGuards(ApiKeyGuard),
    UseInterceptors(ApiAccessLogInterceptor),
    Public(),
    ApiTags('开放API'),
    ApiHeader({
      name: 'X-API-Key',
      description: 'API密钥',
      required: true,
    }),
  );

export const OpenApiEndpoint = (metadata: OpenApiEndpointMetadata) =>
  applyDecorators(
    RequireApiScopes(metadata.scope),
    SetMetadata(OPEN_API_ENDPOINT_KEY, metadata),
    ApiOperation({
      summary: metadata.summary,
      description: metadata.description,
    }),
  );
