import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiAuthService } from '../services/api-auth.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiAppDto } from '../dto/update-api-app.dto';
import { QueryApiAppsDto } from '../dto/query-api-apps.dto';
import { QueryApiAccessLogsDto } from '../dto/query-api-access-logs.dto';
import {
  ApiAppDeleteResponseDto,
  ApiKeyCreatedResponseDto,
  ApiKeyListItemDto,
  ApiKeyRevokeResponseDto,
} from '../dto/api-app-response.dto';
import { RequirePermissions } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';

@ApiTags('API应用管理')
@ApiBearerAuth()
@Controller('api-apps')
export class ApiAppController {
  constructor(private readonly apiAuthService: ApiAuthService) {}

  @Get()
  @RequirePermissions('api-app:read')
  @ApiOperation({ summary: '获取API应用列表' })
  async getApps(@Query() query: QueryApiAppsDto) {
    return this.apiAuthService.getApps(query);
  }

  @Get('scopes')
  @RequirePermissions('api-app:read')
  @ApiOperation({ summary: '获取开放API权限范围' })
  async getApiScopes() {
    return this.apiAuthService.getApiScopes();
  }

  @Get(':appId/access-logs')
  @RequirePermissions('api-app:key:read')
  @ApiOperation({ summary: '获取应用API访问日志' })
  async getAccessLogs(
    @Param('appId', ParseIntPipe) appId: number,
    @Query() query: QueryApiAccessLogsDto,
  ) {
    return this.apiAuthService.getAccessLogs(appId, query);
  }

  @Get(':appId')
  @RequirePermissions('api-app:read')
  @ApiOperation({ summary: '获取API应用详情' })
  async getApp(@Param('appId', ParseIntPipe) appId: number) {
    return this.apiAuthService.getApp(appId);
  }

  @Post()
  @RequirePermissions('api-app:create')
  @ApiOperation({ summary: '创建API应用' })
  async createApp(@Body() dto: CreateApiAppDto, @CurrentUser() user: AuthenticatedUser) {
    return this.apiAuthService.createApp(dto, user.id);
  }

  @Put(':appId')
  @RequirePermissions('api-app:update')
  @ApiOperation({ summary: '更新API应用' })
  async updateApp(@Param('appId', ParseIntPipe) appId: number, @Body() dto: UpdateApiAppDto) {
    return this.apiAuthService.updateApp(appId, dto);
  }

  @Delete(':appId')
  @RequirePermissions('api-app:delete')
  @ApiOperation({ summary: '删除API应用' })
  async deleteApp(@Param('appId', ParseIntPipe) appId: number) {
    await this.apiAuthService.deleteApp(appId);
    return ApiAppDeleteResponseDto.success();
  }

  @Post(':appId/keys')
  @RequirePermissions('api-app:key:create')
  @ApiOperation({ summary: '生成API密钥' })
  async generateKey(@Param('appId', ParseIntPipe) appId: number, @Body() dto: CreateApiKeyDto) {
    const key = await this.apiAuthService.generateApiKey({
      ...dto,
      appId,
    });

    return ApiKeyCreatedResponseDto.fromKey(key);
  }

  @Get(':appId/keys')
  @RequirePermissions('api-app:key:read')
  @ApiOperation({ summary: '获取应用的所有密钥' })
  async getAppKeys(@Param('appId', ParseIntPipe) appId: number) {
    const keys = await this.apiAuthService.getAppKeys(appId);

    return keys.map((key) => ApiKeyListItemDto.fromKey(key));
  }

  @Delete('keys/:keyId')
  @RequirePermissions('api-app:key:delete')
  @ApiOperation({ summary: '撤销API密钥' })
  async revokeKey(@Param('keyId', ParseIntPipe) keyId: number) {
    await this.apiAuthService.revokeApiKey(keyId);
    return ApiKeyRevokeResponseDto.success();
  }
}
