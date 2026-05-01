import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '~/core/decorators';
import { UpdateAutomationTaskConfigDto } from '../dto/update-automation-task-config.dto';
import { QueryAutomationTaskLogsDto } from '../dto/query-automation-task-logs.dto';
import { AutomationTaskSchedulerService } from '../services/automation-task-scheduler.service';
import { AutomationTaskService } from '../services/automation-task.service';

@ApiTags('自动化任务')
@ApiBearerAuth()
@Controller('automation/tasks')
export class AutomationTaskController {
  constructor(
    private readonly taskService: AutomationTaskService,
    private readonly scheduler: AutomationTaskSchedulerService,
  ) {}

  @Get()
  @RequirePermissions('automation:read')
  @ApiOperation({ summary: '获取自动化任务列表' })
  async findTasks() {
    return this.taskService.findTasks();
  }

  @Put(':taskKey/config')
  @RequirePermissions('automation:update')
  @ApiOperation({ summary: '更新自动化任务配置' })
  async updateConfig(
    @Param('taskKey') taskKey: string,
    @Body() dto: UpdateAutomationTaskConfigDto,
  ) {
    const config = await this.taskService.updateConfig(taskKey, dto);
    await this.scheduler.rebuildSchedules();
    return config;
  }

  @Post(':taskKey/run')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('automation:execute')
  @ApiOperation({ summary: '立即执行自动化任务' })
  async runTask(@Param('taskKey') taskKey: string) {
    return this.taskService.runTask(taskKey);
  }

  @Get(':taskKey/logs')
  @RequirePermissions('automation:read')
  @ApiOperation({ summary: '获取自动化任务执行日志' })
  async findLogs(@Param('taskKey') taskKey: string, @Query() query: QueryAutomationTaskLogsDto) {
    return this.taskService.findLogs(taskKey, query);
  }
}
