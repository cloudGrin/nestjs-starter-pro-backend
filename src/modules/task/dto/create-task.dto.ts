import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType } from '../entities/task-definition.entity';
import { RetryPolicyDto } from './retry-policy.dto';
import { AlertConfigDto } from './alert-config.dto';

export class CreateTaskDto {
  @ApiProperty({ description: '任务编码', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: '任务名称', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '任务类型', enum: TaskType, default: TaskType.CRON })
  @IsEnum(TaskType)
  type: TaskType = TaskType.CRON;

  @ApiPropertyOptional({ description: 'Cron 表达式或间隔配置' })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({ description: '执行参数', type: Object })
  @IsOptional()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '处理器名称', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  handler?: string;

  @ApiPropertyOptional({ description: '是否允许手动触发', default: false })
  @IsOptional()
  @IsBoolean()
  allowManual?: boolean = false;

  @ApiPropertyOptional({
    description: '任务执行超时时间（毫秒）',
    default: 3600000,
    minimum: 1000,
    example: 3600000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  timeout?: number;

  @ApiPropertyOptional({
    description: '重试策略配置',
    type: RetryPolicyDto,
    example: {
      enabled: true,
      maxRetries: 3,
      retryDelay: 60000,
      backoffMultiplier: 2,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;

  @ApiPropertyOptional({
    description: '告警配置',
    type: AlertConfigDto,
    example: {
      enabled: true,
      channels: ['log', 'notification'],
      onlyOnConsecutiveFailures: 3,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertConfigDto)
  alertConfig?: AlertConfigDto;
}
