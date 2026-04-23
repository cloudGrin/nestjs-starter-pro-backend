import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';
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
    description: 'API权限范围',
    example: ['read:users', 'read:orders', 'write:orders'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: '所有者用户ID',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  ownerId?: number;
}
