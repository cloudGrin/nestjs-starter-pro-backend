import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '~/common/dto/pagination.dto';

export class QueryPermissionDto extends PaginationDto {
  @ApiPropertyOptional({ description: '权限编码（模糊搜索）' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '权限名称（模糊搜索）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '所属模块' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否为系统内置' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isSystem?: boolean;
}
