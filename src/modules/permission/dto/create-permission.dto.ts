import { IsBoolean, IsString, IsOptional, IsInt, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { toOptionalBoolean } from '~/common/utils';

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
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '权限描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
