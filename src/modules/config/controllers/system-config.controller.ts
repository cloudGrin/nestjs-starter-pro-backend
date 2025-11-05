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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SystemConfigService } from '../services/system-config.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  QuerySystemConfigDto,
  UpdateConfigValueDto,
  BatchUpdateConfigDto,
} from '../dto/system-config.dto';
import { ApiSuccessResponse, ApiPaginatedResponse } from '~/core/decorators/api-response.decorator';
import { RequirePermissions } from '~/core/decorators';
import { SystemConfigEntity } from '../entities/system-config.entity';

@ApiTags('系统管理-系统配置')
@ApiBearerAuth()
@Controller('system-configs')
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  @Post()
  @RequirePermissions('config:create')
  @ApiOperation({ summary: '创建配置项' })
  @ApiSuccessResponse(SystemConfigEntity)
  async create(@Body() dto: CreateSystemConfigDto) {
    return this.configService.create(dto);
  }

  @Post('batch')
  @RequirePermissions('config:update')
  @ApiOperation({ summary: '批量更新配置值' })
  async batchUpdate(@Body() dto: BatchUpdateConfigDto) {
    await this.configService.batchUpdateValues(dto);
    return { message: '批量更新成功' };
  }

  @Get()
  @RequirePermissions('config:read')
  @ApiOperation({ summary: '获取配置列表' })
  @ApiPaginatedResponse(SystemConfigEntity)
  async findAll(@Query() query: QuerySystemConfigDto) {
    return this.configService.findAll(query);
  }

  @Get('enabled')
  @ApiOperation({ summary: '获取所有启用的配置' })
  @ApiSuccessResponse(SystemConfigEntity, true)
  async findEnabled() {
    return this.configService.findEnabled();
  }

  @Get('map')
  @ApiOperation({ summary: '获取配置映射（键值对）' })
  async getConfigMap(@Query('keys') keys?: string) {
    const keyArray = keys ? keys.split(',') : undefined;
    return this.configService.getConfigMap(keyArray);
  }

  @Get('key/:key')
  @ApiOperation({ summary: '根据键名获取配置' })
  @ApiParam({ name: 'key', description: '配置键名' })
  @ApiSuccessResponse(SystemConfigEntity)
  async findByKey(@Param('key') key: string) {
    return this.configService.findByKey(key);
  }

  @Get('value/:key')
  @ApiOperation({ summary: '获取配置值' })
  @ApiParam({ name: 'key', description: '配置键名' })
  async getValue(@Param('key') key: string) {
    const value = await this.configService.getValue(key);
    return { key, value };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取配置详情' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiSuccessResponse(SystemConfigEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('config:update')
  @ApiOperation({ summary: '更新配置项' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiSuccessResponse(SystemConfigEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSystemConfigDto) {
    return this.configService.update(id, dto);
  }

  @Put(':id/toggle')
  @RequirePermissions('config:update')
  @ApiOperation({ summary: '切换启用状态' })
  @ApiParam({ name: 'id', description: '配置ID' })
  @ApiSuccessResponse(SystemConfigEntity)
  async toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.configService.toggleEnabled(id);
  }

  @Put('key/:key/value')
  @RequirePermissions('config:update')
  @ApiOperation({ summary: '设置配置值' })
  @ApiParam({ name: 'key', description: '配置键名' })
  @ApiSuccessResponse(SystemConfigEntity)
  async setValue(@Param('key') key: string, @Body() dto: UpdateConfigValueDto) {
    return this.configService.setValue(key, dto.configValue);
  }

  @Delete(':id')
  @RequirePermissions('config:delete')
  @ApiOperation({ summary: '删除配置项' })
  @ApiParam({ name: 'id', description: '配置ID' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.configService.delete(id);
    return { message: '删除成功' };
  }
}
