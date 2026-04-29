import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function emptyToNull(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value as any;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

export class UpdateUserNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Bark 设备 Key', nullable: true, maxLength: 255 })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(255)
  barkKey?: string | null;

  @ApiPropertyOptional({ description: '飞书用户 user_id', nullable: true, maxLength: 128 })
  @IsOptional()
  @Transform(({ value }) => emptyToNull(value))
  @IsString()
  @MaxLength(128)
  feishuUserId?: string | null;
}
