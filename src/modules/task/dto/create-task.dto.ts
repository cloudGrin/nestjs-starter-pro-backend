import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { NotificationChannel } from '~/modules/notification/entities/notification.entity';
import { TaskRecurrenceType, TaskType } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({
    description: '任务标题',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: '任务描述',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '所属清单ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listId: number;

  @ApiPropertyOptional({
    description: '负责人用户ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({
    description: '任务类型',
    enum: TaskType,
    default: TaskType.TASK,
  })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({
    description: '到期时间',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional({
    description: '提醒时间',
  })
  @IsOptional()
  @IsDateString()
  remindAt?: string;

  @ApiPropertyOptional({
    description: '是否重要',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  important?: boolean;

  @ApiPropertyOptional({
    description: '是否紧急',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({
    description: '标签',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: '重复规则',
    enum: TaskRecurrenceType,
    default: TaskRecurrenceType.NONE,
  })
  @IsOptional()
  @IsEnum(TaskRecurrenceType)
  recurrenceType?: TaskRecurrenceType;

  @ApiPropertyOptional({
    description: '重复间隔。custom 表示间隔天数，其他重复规则表示对应单位间隔。',
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceInterval?: number;

  @ApiPropertyOptional({
    description: '提醒渠道',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  reminderChannels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: '是否发送 Bark/飞书等外部提醒',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendExternalReminder?: boolean;
}
