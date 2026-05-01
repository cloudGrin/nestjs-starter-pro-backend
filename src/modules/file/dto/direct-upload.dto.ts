import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalBooleanFromTransform } from '~/common/utils';

export class CreateDirectUploadDto {
  @ApiProperty({
    description: '原始文件名',
    example: 'photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  @ApiProperty({
    description: 'MIME 类型',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  mimeType: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 102400,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;

  @ApiPropertyOptional({
    description: '业务模块标识',
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

export class CompleteDirectUploadDto {
  @ApiProperty({
    description: '初始化直传时返回的上传令牌',
  })
  @IsString()
  @IsNotEmpty()
  uploadToken: string;
}
