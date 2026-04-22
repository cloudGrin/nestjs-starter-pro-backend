import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '~/core/decorators/public.decorator';
import { UserService } from '~/modules/user/services/user.service';
import { ApiAuthService } from '~/modules/api-auth/services/api-auth.service';
import { ApiKeyGuard } from '~/modules/api-auth/guards/api-key.guard';
import { RequireApiScopes } from '~/modules/api-auth/decorators/api-scopes.decorator';
import { ApiRequest } from '../types/request.types';

interface UserListQuery {
  page?: number;
  pageSize?: number;
}

@ApiTags('开放API')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API密钥',
  required: true,
})
@Controller('v1/open')
@UseGuards(ApiKeyGuard)
@Public()
export class OpenApiController {
  constructor(
    private readonly userService: UserService,
    private readonly apiAuthService: ApiAuthService,
  ) {}

  @Get('users')
  @RequireApiScopes('read:users')
  @ApiOperation({ summary: '获取用户列表', description: '需要 read:users 权限' })
  async getUsers(@Query() query: UserListQuery, @Req() req: ApiRequest) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.userService.findUsers({
      page,
      limit: pageSize,
    });

    return {
      data: result.items.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        nickname: user.nickname,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
      })),
      pagination: {
        total: result.meta.totalItems,
        page: result.meta.currentPage,
        pageSize: result.meta.itemsPerPage,
      },
      app: {
        id: req.user.id,
        name: req.user.name,
      },
    };
  }

  @Get('statistics')
  @RequireApiScopes('read:statistics')
  @ApiOperation({ summary: '获取当前 API 应用统计' })
  async getStatistics(@Req() req: ApiRequest) {
    const app = await this.apiAuthService.getApp(req.user.id);
    const endpoints = await this.apiAuthService.getApiStatistics(req.user.id, 'day');

    return {
      appName: app.name,
      totalCalls: app.totalCalls || 0,
      rateLimits: {
        perHour: app.rateLimitPerHour,
        perDay: app.rateLimitPerDay,
      },
      lastCalledAt: app.lastCalledAt,
      endpoints,
    };
  }
}
