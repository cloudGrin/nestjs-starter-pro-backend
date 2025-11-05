import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Allow } from 'class-validator';

export class UploadFileDto {
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
  @Allow() // 允许任何值，不进行验证
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
