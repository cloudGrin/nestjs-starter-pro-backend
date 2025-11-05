import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../entities/task-definition.entity';

export class UpdateTaskStatusDto {
  @ApiProperty({ description: '任务状态', enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
