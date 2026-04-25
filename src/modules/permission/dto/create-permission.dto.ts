import { IsString, IsOptional, IsInt, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePermissionDto {
  @ApiProperty({ description: '权限编码（唯一）', example: 'user:create' })
  @IsString()
  @Length(1, 100)
  code: string;

  @ApiProperty({ description: '权限名称', example: '创建用户' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: '所属模块', example: 'user' })
  @IsString()
  @Length(1, 50)
  module: string;

  @ApiPropertyOptional({ description: '排序值', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否为系统内置（不可删除）', default: false })
  @IsOptional()
  @Type(() => Boolean)
  isSystem?: boolean;

  @ApiPropertyOptional({ description: '权限描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
