import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, IsBoolean, IsEnum } from 'class-validator';
import { toOptionalBooleanFromTransform } from '~/common/utils';
import { FileStorageType } from '../entities/file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: '目标存储类型。不传时使用系统默认存储。',
    enum: FileStorageType,
    default: FileStorageType.LOCAL,
  })
  @IsOptional()
  @IsEnum(FileStorageType)
  storage?: FileStorageType;

  @ApiPropertyOptional({
    description: '业务模块标识，用于分类管理',
    maxLength: 100,
    example: 'user-avatar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  module?: string;

  @ApiPropertyOptional({
    description: '业务标签，多个标签使用逗号分隔',
    maxLength: 200,
    example: 'avatar,profile',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;

  @ApiPropertyOptional({
    description: '是否公开访问',
    default: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBooleanFromTransform)
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: '自定义备注信息',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
