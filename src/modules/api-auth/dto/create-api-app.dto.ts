import { IsString, IsOptional, IsArray, IsNumber, IsUrl, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiAppDto {
  @ApiProperty({
    description: '应用名称',
    example: 'My E-commerce Platform',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: '应用描述',
    example: '第三方电商平台集成',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '回调URL',
    example: 'https://example.com/callback',
  })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'API权限范围',
    example: ['read:users', 'read:orders', 'write:orders'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'IP白名单',
    example: ['192.168.1.1', '10.0.0.0/24'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @ApiPropertyOptional({
    description: '每小时API调用限制',
    example: 1000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  rateLimitPerHour?: number;

  @ApiPropertyOptional({
    description: '每日API调用限制',
    example: 10000,
    default: 10000,
  })
  @IsOptional()
  @IsNumber()
  rateLimitPerDay?: number;

  @ApiPropertyOptional({
    description: '所有者用户ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  ownerId?: number;
}
