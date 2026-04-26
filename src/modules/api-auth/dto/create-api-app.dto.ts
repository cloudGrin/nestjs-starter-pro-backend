import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiAppDto {
  @ApiProperty({
    description: '应用名称',
    example: 'personal-mini-program',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: '应用描述',
    example: '个人小程序后端接入',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'API权限范围',
    example: ['read:users', 'read:orders', 'write:orders'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];
}
