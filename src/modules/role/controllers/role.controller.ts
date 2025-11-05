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
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { AssignMenusDto } from '../dto/assign-menus.dto';
import { RevokeMenusDto } from '../dto/revoke-menus.dto';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  RequirePermissions,
} from '~/core/decorators';
import { RoleEntity } from '../entities/role.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';
import { AdminOnly } from '~/modules/auth/decorators/roles.decorator';

@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('roles')
@AdminOnly() // 只有管理员可以管理角色
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: '创建角色' })
  @ApiSuccessResponse(RoleEntity)
  async create(@Body() dto: CreateRoleDto) {
    return this.roleService.createRole(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取角色列表' })
  @ApiPaginatedResponse(RoleEntity)
  async findAll(
    @Query()
    query: {
      name?: string;
      code?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    return this.roleService.findRoles(query);
  }

  @Get('active')
  @ApiOperation({ summary: '获取所有活跃角色' })
  @ApiSuccessResponse(RoleEntity, true)
  async findActiveRoles() {
    return this.roleService.findActiveRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiSuccessResponse(RoleEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findRoleById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiSuccessResponse(RoleEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateRoleDto>) {
    return this.roleService.updateRole(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roleService.deleteRole(id);
    return { message: '删除成功' };
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: '分配权限' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiSuccessResponse(RoleEntity)
  async assignPermissions(@Param('id', ParseIntPipe) id: number, @Body() permissionIds: number[]) {
    return this.roleService.assignPermissions(id, permissionIds);
  }

  // ==================== 🆕 RBAC 2.0 新增接口 ====================

  @Get(':id/effective-permissions')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: '获取角色的有效权限',
    description: '获取角色的所有有效权限（含权限组中的权限和继承的父角色权限）',
  })
  @ApiParam({ name: 'id', description: '角色ID' })
  async getEffectivePermissions(@Param('id', ParseIntPipe) id: number) {
    const permissions = await this.roleService.getEffectivePermissions(id);
    return {
      roleId: id,
      permissions,
      count: permissions.length,
    };
  }

  @Post('check-exclusive')
  @RequirePermissions('role:read')
  @ApiOperation({
    summary: '检查角色互斥冲突',
    description: '检查要分配给用户的多个角色之间是否存在互斥冲突',
  })
  async checkExclusiveConflict(@Body() dto: { userId: number; roleIds: number[] }) {
    return this.roleService.checkExclusiveConflict(dto.userId, dto.roleIds);
  }

  // ==================== 🆕 菜单管理接口 ====================

  @Post(':id/menus')
  @RequirePermissions('role:menu:assign')
  @ApiOperation({
    summary: '分配菜单给角色',
    description: '为角色分配可访问的菜单列表',
  })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiSuccessResponse(RoleEntity)
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
  @ApiSuccessResponse(MenuEntity, true)
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
  @ApiSuccessResponse(RoleEntity)
  async revokeMenus(@Param('id', ParseIntPipe) id: number, @Body() dto: RevokeMenusDto) {
    return this.roleService.revokeMenus(id, dto.menuIds);
  }
}
