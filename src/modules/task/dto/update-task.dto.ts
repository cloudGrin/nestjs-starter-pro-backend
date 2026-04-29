import { ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
} from 'class-validator';
import { NotificationChannel } from '~/modules/notification/entities/notification.entity';
import { TaskRecurrenceType, TaskType } from '../entities/task.entity';

const IsProvided = () => ValidateIf((_object, value) => value !== undefined);

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: '任务标题',
    maxLength: 200,
  })
  @IsProvided()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: '任务描述',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    description: '所属清单ID',
  })
  @IsProvided()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listId?: number;

  @ApiPropertyOptional({
    description: '负责人用户ID',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number | null;

  @ApiPropertyOptional({
    description: '任务类型',
    enum: TaskType,
  })
  @IsProvided()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({
    description: '到期时间',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;

  @ApiPropertyOptional({
    description: '提醒时间',
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  remindAt?: string | null;

  @ApiPropertyOptional({
    description: '是否重要',
  })
  @IsProvided()
  @IsBoolean()
  important?: boolean;

  @ApiPropertyOptional({
    description: '是否紧急',
  })
  @IsProvided()
  @IsBoolean()
  urgent?: boolean;

  @ApiPropertyOptional({
    description: '标签',
    type: [String],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @ApiPropertyOptional({
    description: '重复规则',
    enum: TaskRecurrenceType,
  })
  @IsProvided()
  @IsEnum(TaskRecurrenceType)
  recurrenceType?: TaskRecurrenceType;

  @ApiPropertyOptional({
    description: '重复间隔。custom 表示间隔天数，其他重复规则表示对应单位间隔。',
    minimum: 1,
    maximum: 365,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrenceInterval?: number | null;

  @ApiPropertyOptional({
    description: '提醒渠道',
    enum: NotificationChannel,
    isArray: true,
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  reminderChannels?: NotificationChannel[] | null;

  @ApiPropertyOptional({
    description: '是否发送 Bark/飞书等外部提醒',
  })
  @IsProvided()
  @IsBoolean()
  sendExternalReminder?: boolean;
}
