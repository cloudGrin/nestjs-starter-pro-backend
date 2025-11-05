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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { ChangePasswordDto, ResetPasswordDto } from '../dto/change-password.dto';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiCreateResponse,
  ApiUpdateResponse,
  ApiDeleteResponse,
  ApiGetOneResponse,
  ApiGetManyResponse,
  ApiCommonResponses,
  ApiBatchOperationResponse,
  ApiCreateUserExample,
  ApiPaginationExample,
  ApiDeleteExample,
  RequirePermissions,
} from '~/core/decorators';
import { UserEntity } from '../entities/user.entity';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
// @UseGuards(JwtAuthGuard) // 将在认证模块创建后添加
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user:create')
  @ApiCreateResponse(UserEntity, '创建用户')
  @ApiCreateUserExample()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Get()
  @RequirePermissions('user:read')
  @ApiGetManyResponse(UserEntity, '获取用户列表')
  async findAll(@Query() query: QueryUserDto) {
    return this.userService.findUsers(query);
  }

  // 注意：具体路径必须在参数化路径之前定义，否则会被 :id 匹配
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiSuccessResponse(UserEntity)
  @ApiCommonResponses()
  async getProfile(@Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.userService.findUserById(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新当前用户信息' })
  @ApiSuccessResponse(UserEntity)
  @ApiCommonResponses()
  async updateProfile(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const userId = (req as any).user?.id;
    return this.userService.updateUser(userId, dto);
  }

  @Put('password')
  @ApiOperation({ summary: '修改密码' })
  @ApiCommonResponses()
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const userId = (req as any).user?.id;
    await this.userService.changePassword(userId, dto);
    return { message: '密码修改成功' };
  }

  @Delete('batch')
  @RequirePermissions('user:delete')
  @ApiBatchOperationResponse('批量删除用户')
  async removeMany(@Body() ids: number[]) {
    await this.userService.deleteUsers(ids);
    return { message: '批量删除成功' };
  }

  @Get(':id')
  @RequirePermissions('user:read')
  @ApiGetOneResponse(UserEntity, '获取用户详情')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserById(id);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  @ApiUpdateResponse(UserEntity, '更新用户')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiDeleteResponse('删除用户')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUser(id);
    return { message: '删除成功' };
  }

  @Put(':id/password/reset')
  @RequirePermissions('user:update', 'admin')
  @ApiOperation({ summary: '重置用户密码（管理员）' })
  @ApiParam({ name: 'id', description: '用户ID' })
  async resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    await this.userService.resetPassword(id, dto);
    return { message: '密码重置成功' };
  }

  @Put(':id/enable')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: '启用用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiSuccessResponse(UserEntity)
  async enable(@Param('id', ParseIntPipe) id: number) {
    return this.userService.enableUser(id);
  }

  @Put(':id/disable')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: '禁用用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiSuccessResponse(UserEntity)
  async disable(@Param('id', ParseIntPipe) id: number) {
    return this.userService.disableUser(id);
  }

  @Put(':id/roles')
  @RequirePermissions('user:update', 'role:assign')
  @ApiOperation({ summary: '分配角色' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiSuccessResponse(UserEntity)
  async assignRoles(@Param('id', ParseIntPipe) id: number, @Body() roleIds: number[]) {
    return this.userService.assignRoles(id, roleIds);
  }

  @Get(':id/permissions')
  @RequirePermissions('user:read', 'permission:read')
  @ApiOperation({ summary: '获取用户权限' })
  @ApiParam({ name: 'id', description: '用户ID' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    const permissions = await this.userService.getUserPermissions(id);
    return { permissions };
  }
}
