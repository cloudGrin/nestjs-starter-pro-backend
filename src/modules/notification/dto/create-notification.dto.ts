import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    description: '通知标题',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiProperty({
    description: '通知内容（支持HTML）',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: '通知类型',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType = NotificationType.SYSTEM;

  @ApiPropertyOptional({
    description: '通知优先级',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.NORMAL;

  @ApiPropertyOptional({
    description: '接收用户ID列表（为空时，如果 isBroadcast=true 将通知所有用户）',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @ValidateIf((dto: CreateNotificationDto) => !dto.isBroadcast)
  recipientIds?: number[];

  @ApiPropertyOptional({
    description: '是否广播给所有用户（仅管理员）',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isBroadcast?: boolean = false;

  @ApiPropertyOptional({
    description: '发送渠道列表（默认仅站内通知）',
    enum: NotificationChannel,
    isArray: true,
    default: [NotificationChannel.INTERNAL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: '是否触发外部渠道推送',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sendExternal?: boolean = false;

  @ApiPropertyOptional({
    description: '额外的元数据（如跳转链接、参数等）',
    type: Object,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: '过期时间（ISO8601格式）',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  expireAt?: string;
}
