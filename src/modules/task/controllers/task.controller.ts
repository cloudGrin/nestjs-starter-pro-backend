import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { CreateTaskDto, QueryTaskDto, UpdateTaskDto } from '../dto';
import { TaskService } from '../services/task.service';

@ApiTags('任务管理')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '获取任务列表' })
  async findTasks(@Query() query: QueryTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.findTasks(query, user);
  }

  @Post()
  @RequirePermissions('task:create')
  @ApiOperation({ summary: '创建任务' })
  async createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.createTask(dto, user);
  }

  @Get('assignees')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '获取任务负责人候选人' })
  async findAssignees() {
    return this.taskService.findAssigneeOptions();
  }

  @Get(':id')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '获取任务详情' })
  async findTask(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.findTask(id, user);
  }

  @Put(':id')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: '更新任务' })
  async updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taskService.updateTask(id, dto, user);
  }

  @Patch(':id/complete')
  @RequirePermissions('task:complete')
  @ApiOperation({ summary: '完成任务' })
  async completeTask(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.taskService.completeTask(id, user.id, user);
  }

  @Patch(':id/reopen')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: '重新打开任务' })
  async reopenTask(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.taskService.reopenTask(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('task:delete')
  @ApiOperation({ summary: '删除任务' })
  async removeTask(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.taskService.removeTask(id, user);
  }
}
