import { Get, Query, Req } from '@nestjs/common';
import {
  OpenApiEndpoint,
  OpenApiResourceController,
} from '~/modules/api-auth/decorators/api-scopes.decorator';
import { ApiRequest } from '../types/request.types';
import { OpenUserListQueryDto } from '../dto/open-user-list-query.dto';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';
import { OpenApiUserService } from '../services/open-api-user.service';

@OpenApiResourceController('open')
export class OpenApiController {
  constructor(private readonly openApiUserService: OpenApiUserService) {}

  @Get('users')
  @OpenApiEndpoint({
    scope: 'read:users',
    label: '读取用户公开资料',
    description: '获取用户公开资料列表，不包含密码等敏感字段',
    group: { key: 'open-user', title: '用户公开资料' },
    summary: '获取用户公开资料列表',
  })
  async getUsers(
    @Query() query: OpenUserListQueryDto,
    @Req() req: ApiRequest,
  ): Promise<OpenUserListResponseDto> {
    return this.openApiUserService.getUsers(query, {
      id: req.user.id,
      name: req.user.name,
    });
  }
}
