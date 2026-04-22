import { IsNumber, IsString, IsOptional, IsArray, IsDate, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ApiKeyEnvironment {
  PRODUCTION = 'production',
  TEST = 'test',
}

export class CreateApiKeyDto {
  @ApiPropertyOptional({
    description: '所属应用ID（从路径参数自动填充）',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  appId?: number;

  @ApiProperty({
    description: '密钥名称',
    example: 'Production Key',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: '环境类型',
    enum: ApiKeyEnvironment,
    example: ApiKeyEnvironment.PRODUCTION,
  })
  @IsEnum(ApiKeyEnvironment)
  environment: ApiKeyEnvironment;

  @ApiPropertyOptional({
    description: '自定义权限范围（覆盖应用级别）',
    example: ['read:users', 'read:orders'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: '过期时间',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}
