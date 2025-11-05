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
  Matches,
} from 'class-validator';
import { ConfigType, ConfigGroup } from '../entities/system-config.entity';
import { PaginationDto } from '~/common/dto/pagination.dto';

export class CreateSystemConfigDto {
  @ApiProperty({
    description: '配置键名',
    example: 'site_name',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: '配置键名只能包含小写字母、数字和下划线，且必须以字母开头',
  })
  configKey: string;

  @ApiProperty({
    description: '配置名称',
    example: '站点名称',
  })
  @IsString()
  @MaxLength(100)
  configName: string;

  @ApiPropertyOptional({
    description: '配置值',
    example: 'home Admin',
  })
  @IsOptional()
  @IsString()
  configValue?: string;

  @ApiPropertyOptional({
    description: '配置类型',
    enum: ConfigType,
    default: ConfigType.TEXT,
  })
  @IsOptional()
  @IsEnum(ConfigType)
  configType?: ConfigType;

  @ApiPropertyOptional({
    description: '配置分组',
    enum: ConfigGroup,
    default: ConfigGroup.OTHER,
  })
  @IsOptional()
  @IsEnum(ConfigGroup)
  configGroup?: ConfigGroup;

  @ApiPropertyOptional({
    description: '配置描述',
    example: '系统站点名称配置',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '默认值',
    example: 'Default Site',
  })
  @IsOptional()
  @IsString()
  defaultValue?: string;

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
    description: '扩展属性',
    example: { validation: 'string' },
  })
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

export class UpdateSystemConfigDto extends PartialType(CreateSystemConfigDto) {}

export class QuerySystemConfigDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '配置键名',
  })
  @IsOptional()
  @IsString()
  configKey?: string;

  @ApiPropertyOptional({
    description: '配置名称',
  })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiPropertyOptional({
    description: '配置类型',
    enum: ConfigType,
  })
  @IsOptional()
  @IsEnum(ConfigType)
  configType?: ConfigType;

  @ApiPropertyOptional({
    description: '配置分组',
    enum: ConfigGroup,
  })
  @IsOptional()
  @IsEnum(ConfigGroup)
  configGroup?: ConfigGroup;

  @ApiPropertyOptional({
    description: '是否启用',
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateConfigValueDto {
  @ApiProperty({
    description: '配置值',
  })
  @IsString()
  configValue: string;
}

export class BatchUpdateConfigDto {
  @ApiProperty({
    description: '配置项列表',
    type: 'object',
    additionalProperties: true,
    example: {
      site_name: 'My Site',
      site_description: 'Welcome to my site',
    },
  })
  @IsObject()
  configs: Record<string, string>;
}
