import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AllowAuthenticated, RequirePermissions } from '~/core/decorators';
import { MenuService } from '../services/menu.service';
import {
  CreateMenuDto,
  UpdateMenuDto,
  QueryMenuDto,
  BatchUpdateMenuStatusDto,
  MoveMenuDto,
  ValidateMenuPathDto,
  ValidateMenuPathResponseDto,
} from '../dto';
import { MenuEntity } from '../entities/menu.entity';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { MessageResponseDto } from '~/common/dto/message-response.dto';

@ApiTags('菜单管理')
@ApiBearerAuth()
@Controller('menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @RequirePermissions('menu:create')
  @ApiOperation({ summary: '创建菜单' })
  @ApiOkResponse({ type: MenuEntity })
  async create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Get()
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: '获取菜单列表' })
  async findAll(@Query() query: QueryMenuDto) {
    return this.menuService.findAll(query);
  }

  @Get('tree')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: '获取菜单树' })
  async getTree() {
    return this.menuService.getMenuTree();
  }

  @Get('user-menus')
  @AllowAuthenticated()
  @ApiOperation({
    summary: '获取当前用户的菜单',
    description: '根据用户角色过滤可访问的菜单，返回树形结构',
  })
  async getUserMenus(@CurrentUser() user: AuthenticatedUser) {
    return this.menuService.getUserMenusByRoles(user.id, user.roles || []);
  }

  @Get('validate-path')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: '验证菜单路径是否唯一' })
  @ApiQuery({ name: 'path', description: '菜单路径', type: String })
  @ApiQuery({
    name: 'excludeId',
    description: '排除的菜单ID(更新时使用)',
    type: Number,
    required: false,
  })
  @ApiOkResponse({ type: ValidateMenuPathResponseDto })
  async validatePath(@Query() query: ValidateMenuPathDto) {
    const isUnique = await this.menuService.validatePath(query.path, query.excludeId);
    return ValidateMenuPathResponseDto.of(isUnique);
  }

  @Get(':id')
  @RequirePermissions('menu:read')
  @ApiOperation({ summary: '获取菜单详情' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiOkResponse({ type: MenuEntity })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: '更新菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiOkResponse({ type: MenuEntity })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMenuDto) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('menu:delete')
  @ApiOperation({ summary: '删除菜单' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiOkResponse({ type: MessageResponseDto })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.menuService.delete(id);
    return MessageResponseDto.of('删除成功');
  }

  @Patch('batch-status')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: '批量启用/禁用菜单' })
  @ApiOkResponse({ type: MessageResponseDto })
  async batchUpdateStatus(@Body() dto: BatchUpdateMenuStatusDto) {
    await this.menuService.batchUpdateStatus(dto.menuIds, dto.isActive);
    return MessageResponseDto.of('批量更新成功');
  }

  @Patch(':id/move')
  @RequirePermissions('menu:update')
  @ApiOperation({ summary: '移动菜单到新的父节点' })
  @ApiParam({ name: 'id', description: '菜单ID' })
  @ApiOkResponse({ type: MenuEntity })
  async moveMenu(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveMenuDto) {
    return this.menuService.moveMenu(id, dto.targetParentId ?? null);
  }
}
