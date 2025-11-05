import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
  MinLength,
  IsObject,
  Matches,
} from 'class-validator';
import { DictSource } from '../entities/dict-type.entity';
import { PaginationDto } from '~/common/dto/pagination.dto';

export class CreateDictTypeDto {
  @ApiProperty({
    description: '字典类型编码',
    example: 'user_status',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: '字典编码只能包含小写字母、数字和下划线，且必须以字母开头',
  })
  code: string;

  @ApiProperty({
    description: '字典类型名称',
    example: '用户状态',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: '描述',
    example: '用户账号状态管理',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '字典来源',
    enum: DictSource,
    default: DictSource.CUSTOM,
  })
  @IsOptional()
  @IsEnum(DictSource)
  source?: DictSource;

  @ApiPropertyOptional({
    description: '是否启用',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: '排序',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiPropertyOptional({
    description: '扩展配置',
    example: { syncFrom: 'external_api' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateDictTypeDto extends PartialType(CreateDictTypeDto) {}

export class QueryDictTypeDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '字典类型编码',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: '字典类型名称',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '字典来源',
    enum: DictSource,
  })
  @IsOptional()
  @IsEnum(DictSource)
  source?: DictSource;

  @ApiPropertyOptional({
    description: '是否启用',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
