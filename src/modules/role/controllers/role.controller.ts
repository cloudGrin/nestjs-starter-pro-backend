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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { QueryRoleDto } from '../dto/query-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { AssignMenusDto } from '../dto/assign-menus.dto';
import { RevokeMenusDto } from '../dto/revoke-menus.dto';
import { RequirePermissions } from '~/core/decorators';
import { RoleEntity } from '../entities/role.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';
import { MessageResponseDto } from '~/common/dto/message-response.dto';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('role:create')
  @ApiOperation({ summary: '创建角色' })
  @ApiOkResponse({ type: RoleEntity })
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.createRole(dto);
  }

  @Get()
  @RequirePermissions('role:read')
  @ApiOperation({ summary: '获取角色列表' })
  @ApiOkResponse({ description: '获取角色列表成功' })
  async findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findRoles(query);
  }

  @Get('active')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: '获取所有活跃角色' })
  @ApiOkResponse({ type: RoleEntity, isArray: true })
  async findActiveRoles() {
    return this.roleService.findActiveRoles();
  }

  @Get(':id')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: '获取角色详情' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: RoleEntity })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findRoleById(id);
  }

  @Put(':id')
  @RequirePermissions('role:update')
  @ApiOperation({ summary: '更新角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: RoleEntity })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.roleService.updateRole(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  @ApiOperation({ summary: '删除角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: MessageResponseDto })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roleService.deleteRole(id);
    return MessageResponseDto.of('删除成功');
  }

  @Put(':id/permissions')
  @RequirePermissions('role:permission:assign')
  @ApiOperation({ summary: '分配权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: RoleEntity })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roleService.assignPermissions(id, dto.permissionIds);
  }

  @Post(':id/menus')
  @RequirePermissions('role:menu:assign')
  @ApiOperation({
    summary: '分配菜单给角色',
    description: '为角色分配可访问的菜单列表',
  })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: RoleEntity })
  async assignMenus(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignMenusDto) {
    return this.roleService.assignMenus(id, dto.menuIds);
  }

  @Get(':id/menus')
  @RequirePermissions('role:menu:read')
  @ApiOperation({
    summary: '获取角色的菜单列表',
    description: '查询角色已分配的所有菜单',
  })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: MenuEntity, isArray: true })
  async getRoleMenus(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.getRoleMenus(id);
  }

  @Delete(':id/menus')
  @RequirePermissions('role:menu:revoke')
  @ApiOperation({
    summary: '移除角色的菜单',
    description: '从角色中移除指定的菜单权限',
  })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiOkResponse({ type: RoleEntity })
  async revokeMenus(@Param('id', ParseIntPipe) id: number, @Body() dto: RevokeMenusDto) {
    return this.roleService.revokeMenus(id, dto.menuIds);
  }
}
