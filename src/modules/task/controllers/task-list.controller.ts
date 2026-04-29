import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { CreateTaskListDto, UpdateTaskListDto } from '../dto';
import { TaskListService } from '../services/task-list.service';

@ApiTags('任务清单')
@ApiBearerAuth()
@Controller('task-lists')
export class TaskListController {
  constructor(private readonly taskListService: TaskListService) {}

  @Get()
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '获取任务清单' })
  async findLists(@CurrentUser() user: AuthenticatedUser) {
    return this.taskListService.findLists(user);
  }

  @Post()
  @RequirePermissions('task-list:manage')
  @ApiOperation({ summary: '创建任务清单' })
  async createList(@Body() dto: CreateTaskListDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskListService.createList(dto, user);
  }

  @Put(':id')
  @RequirePermissions('task-list:manage')
  @ApiOperation({ summary: '更新任务清单' })
  async updateList(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taskListService.updateList(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('task-list:manage')
  @ApiOperation({ summary: '删除任务清单' })
  async removeList(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.taskListService.removeList(id, user);
  }
}
