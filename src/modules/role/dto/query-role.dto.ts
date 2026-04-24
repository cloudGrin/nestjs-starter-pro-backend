import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryRoleDto {
  @ApiPropertyOptional({ description: '角色名称', example: '管理员' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '角色编码', example: 'admin' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return value === 'true';
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
