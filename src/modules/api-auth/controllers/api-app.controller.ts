import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '~/modules/auth/guards/jwt-auth.guard';
import { ApiAuthService } from '../services/api-auth.service';
import { CreateApiAppDto } from '../dto/create-api-app.dto';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { AuthenticatedRequest } from '../types/request.types';
import { RequirePermissions } from '~/core/decorators';

@ApiTags('API应用管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-apps')
export class ApiAppController {
  constructor(private readonly apiAuthService: ApiAuthService) {}

  @Get()
  @RequirePermissions('api-app:read')
  @ApiOperation({ summary: '获取API应用列表' })
  async getApps(@Query('page') page = 1, @Query('limit') limit = 10) {
    const skip = (page - 1) * limit;
    return this.apiAuthService.getApps({ skip, take: limit });
  }

  @Get(':appId')
  @RequirePermissions('api-app:read')
  @ApiOperation({ summary: '获取API应用详情' })
  async getApp(@Param('appId') appId: number) {
    return this.apiAuthService.getApp(appId);
  }

  @Post()
  @RequirePermissions('api-app:create')
  @ApiOperation({ summary: '创建API应用' })
  async createApp(@Body() dto: CreateApiAppDto, @Req() req: AuthenticatedRequest) {
    // 设置所有者
    const dtoWithOwner = {
      ...dto,
      ownerId: req.user.id,
    };
    return this.apiAuthService.createApp(dtoWithOwner);
  }

  @Put(':appId')
  @RequirePermissions('api-app:update')
  @ApiOperation({ summary: '更新API应用' })
  async updateApp(@Param('appId') appId: number, @Body() dto: Partial<CreateApiAppDto>) {
    return this.apiAuthService.updateApp(appId, dto);
  }

  @Delete(':appId')
  @RequirePermissions('api-app:delete')
  @ApiOperation({ summary: '删除API应用' })
  async deleteApp(@Param('appId') appId: number) {
    await this.apiAuthService.deleteApp(appId);
    return { success: true, message: 'API应用已删除' };
  }

  @Post(':appId/keys')
  @RequirePermissions('api-app:key:create')
  @ApiOperation({ summary: '生成API密钥' })
  async generateKey(@Param('appId') appId: number, @Body() dto: CreateApiKeyDto) {
    const key = await this.apiAuthService.generateApiKey({
      ...dto,
      appId,
    });

    // 返回包含原始密钥的响应（仅此一次可见）
    return {
      id: key.id,
      name: key.name,
      key: key.rawKey, // 原始密钥，需要用户保存
      prefix: key.prefix,
      suffix: key.suffix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      message: '请立即复制并安全保存此密钥，它将不会再次显示',
    };
  }

  @Get(':appId/keys')
  @RequirePermissions('api-app:key:read')
  @ApiOperation({ summary: '获取应用的所有密钥' })
  async getAppKeys(@Param('appId') appId: number) {
    const keys = await this.apiAuthService.getAppKeys(appId);

    // 不返回原始密钥，只返回前缀和后缀
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      displayKey: `${key.prefix}_****...${key.suffix}`,
      scopes: key.scopes,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      usageCount: key.usageCount,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  @Delete('keys/:keyId')
  @RequirePermissions('api-app:key:delete')
  @ApiOperation({ summary: '撤销API密钥' })
  async revokeKey(@Param('keyId') keyId: number) {
    await this.apiAuthService.revokeApiKey(keyId);
    return {
      success: true,
      message: 'API密钥已撤销',
    };
  }

}
