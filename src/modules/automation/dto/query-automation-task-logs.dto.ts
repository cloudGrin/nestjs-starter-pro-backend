import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';
import {
  AutomationTaskLogStatus,
  AutomationTaskTriggerType,
} from '../entities/automation-task-log.entity';

export class QueryAutomationTaskLogsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '执行状态',
    enum: AutomationTaskLogStatus,
  })
  @IsOptional()
  @IsEnum(AutomationTaskLogStatus)
  status?: AutomationTaskLogStatus;

  @ApiPropertyOptional({
    description: '触发方式',
    enum: AutomationTaskTriggerType,
  })
  @IsOptional()
  @IsEnum(AutomationTaskTriggerType)
  triggerType?: AutomationTaskTriggerType;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
