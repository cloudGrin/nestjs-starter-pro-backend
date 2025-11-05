import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '~/common/dto/pagination.dto';
import { PermissionType } from '../entities/permission.entity';

export class QueryPermissionDto extends PaginationDto {
  @ApiPropertyOptional({ description: '权限编码（模糊搜索）' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '权限名称（模糊搜索）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '权限类型', enum: PermissionType })
  @IsOptional()
  @IsEnum(PermissionType)
  type?: PermissionType;

  @ApiPropertyOptional({ description: '所属模块' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否为系统内置' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isSystem?: boolean;
}
