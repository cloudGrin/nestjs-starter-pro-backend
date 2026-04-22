import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

/**
 * 告警渠道类型
 */
export enum AlertChannel {
  LOG = 'log',
}

/**
 * 告警配置
 */
export class AlertConfigDto {
  @ApiProperty({ description: '是否启用告警', default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: '告警渠道',
    enum: AlertChannel,
    isArray: true,
    default: [AlertChannel.LOG],
    example: ['log'],
  })
  @IsArray()
  @IsEnum(AlertChannel, { each: true })
  channels: AlertChannel[];

  @ApiPropertyOptional({
    description: '仅在连续失败N次后告警（不设置则每次失败都告警）',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  onlyOnConsecutiveFailures?: number;
}
