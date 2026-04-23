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
import { ApiSuccessResponse, ApiPaginatedResponse, RequirePermissions } from '~/core/decorators';
import { PermissionService } from '../services/permission.service';
import { CreatePermissionDto, UpdatePermissionDto, QueryPermissionDto } from '../dto';
import { PermissionEntity } from '../entities/permission.entity';

@ApiTags('权限管理')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @RequirePermissions('permission:create')
  @ApiOperation({ summary: '创建权限（手动）' })
  @ApiSuccessResponse(PermissionEntity)
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: '获取权限列表' })
  @ApiPaginatedResponse(PermissionEntity)
  async findAll(@Query() query: QueryPermissionDto) {
    return this.permissionService.findAll(query);
  }

  @Get('tree')
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: '获取权限树（按模块分组）' })
  async getTree() {
    return this.permissionService.getPermissionTree();
  }

  @Get(':id')
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: '获取权限详情' })
  @ApiParam({ name: 'id', description: '权限ID' })
  @ApiSuccessResponse(PermissionEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('permission:update')
  @ApiOperation({ summary: '更新权限' })
  @ApiParam({ name: 'id', description: '权限ID' })
  @ApiSuccessResponse(PermissionEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('permission:delete')
  @ApiOperation({ summary: '删除权限' })
  @ApiParam({ name: 'id', description: '权限ID' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.permissionService.delete(id);
    return { message: '删除成功' };
  }

}
