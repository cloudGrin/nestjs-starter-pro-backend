import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  RequirePermissions,
  ApiPaginatedResponse,
  ApiSuccessResponse,
} from '~/core/decorators';
import { TaskService } from '../services/task.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { QueryTaskDto } from '../dto/query-task.dto';
import { TaskDefinitionEntity } from '../entities/task-definition.entity';
import { TaskLogEntity } from '../entities/task-log.entity';
import { TriggerTaskDto } from '../dto/trigger-task.dto';
import { UpdateTaskStatusDto } from '../dto/update-task-status.dto';

@ApiTags('任务调度')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @RequirePermissions('task:create')
  @ApiOperation({ summary: '创建任务' })
  @ApiSuccessResponse(TaskDefinitionEntity)
  async create(@Body() dto: CreateTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Put(':id')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: '更新任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiSuccessResponse(TaskDefinitionEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: '启用/禁用任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  async toggle(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskStatusDto) {
    return this.taskService.toggleTask(id, dto.status);
  }

  @Get()
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '任务列表' })
  @ApiPaginatedResponse(TaskDefinitionEntity)
  async findAll(@Query() query: QueryTaskDto) {
    return this.taskService.findTasks(query);
  }

  @Post(':id/trigger')
  @RequirePermissions('task:trigger')
  @ApiOperation({ summary: '手动触发任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  async trigger(@Param('id', ParseIntPipe) id: number, @Body() dto: TriggerTaskDto) {
    await this.taskService.triggerTask(id, dto);
    return { message: '已触发任务' };
  }

  @Get(':id/logs')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: '获取任务执行日志' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiSuccessResponse(TaskLogEntity, true)
  async logs(@Param('id', ParseIntPipe) id: number) {
    return this.taskService.getTaskLogs(id);
  }
}
