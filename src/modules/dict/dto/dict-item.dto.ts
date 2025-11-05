import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DictItemStatus } from '../entities/dict-item.entity';
import { PaginationDto } from '~/common/dto/pagination.dto';

export class CreateDictItemDto {
  @ApiProperty({
    description: '字典类型ID',
    example: 1,
  })
  @IsNumber()
  dictTypeId: number;

  @ApiProperty({
    description: '字典项标签',
    example: '正常',
  })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    description: '字典项标签（英文）',
    example: 'Active',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  labelEn?: string;

  @ApiProperty({
    description: '字典项值',
    example: 'active',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  @ApiPropertyOptional({
    description: '标签颜色',
    example: '#52c41a',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({
    description: '图标',
    example: 'check-circle',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: '描述',
    example: '用户状态正常',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: DictItemStatus,
    default: DictItemStatus.ENABLED,
  })
  @IsOptional()
  @IsEnum(DictItemStatus)
  status?: DictItemStatus;

  @ApiPropertyOptional({
    description: '是否默认值',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: '排序',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiPropertyOptional({
    description: '扩展数据',
    example: { key: 'value' },
  })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

export class UpdateDictItemDto extends PartialType(CreateDictItemDto) {}

export class QueryDictItemDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '字典类型ID',
  })
  @IsOptional()
  @IsNumber()
  dictTypeId?: number;

  @ApiPropertyOptional({
    description: '字典类型编码',
  })
  @IsOptional()
  @IsString()
  dictTypeCode?: string;

  @ApiPropertyOptional({
    description: '字典项标签',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: '字典项值',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: DictItemStatus,
  })
  @IsOptional()
  @IsEnum(DictItemStatus)
  status?: DictItemStatus;
}

export class BatchCreateDictItemDto {
  @ApiProperty({
    description: '字典类型ID',
    example: 1,
  })
  @IsNumber()
  dictTypeId: number;

  @ApiProperty({
    description: '字典项列表',
    type: [CreateDictItemDto],
  })
  items: Omit<CreateDictItemDto, 'dictTypeId'>[];
}
