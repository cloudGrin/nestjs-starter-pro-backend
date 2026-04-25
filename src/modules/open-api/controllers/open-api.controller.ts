import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '~/core/decorators/public.decorator';
import { ApiKeyGuard } from '~/modules/api-auth/guards/api-key.guard';
import { RequireApiScopes } from '~/modules/api-auth/decorators/api-scopes.decorator';
import { ApiRequest } from '../types/request.types';
import { OpenUserListQueryDto } from '../dto/open-user-list-query.dto';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';
import { OpenApiUserService } from '../services/open-api-user.service';

@ApiTags('开放API')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API密钥',
  required: true,
})
@Controller('open')
@UseGuards(ApiKeyGuard)
@Public()
export class OpenApiController {
  constructor(private readonly openApiUserService: OpenApiUserService) {}

  @Get('users')
  @RequireApiScopes('read:users')
  @ApiOperation({ summary: '获取用户公开资料列表', description: '需要 read:users 权限' })
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
