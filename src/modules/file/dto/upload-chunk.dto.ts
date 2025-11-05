import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UploadChunkDto {
  @ApiProperty({
    description: '上传会话ID，用于断点续传识别',
    example: 'upload-123456',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  uploadId: string;

  @ApiProperty({
    description: '当前分片索引（从1开始）',
    example: 1,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  chunkIndex: number;

  @ApiProperty({
    description: '分片总数',
    example: 10,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(10000)
  totalChunks: number;

  @ApiProperty({
    description: '当前分片大小（字节）',
    example: 5242880,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  chunkSize: number;

  @ApiProperty({
    description: '完整文件大小（字节）',
    example: 20971520,
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  totalSize: number;

  @ApiProperty({
    description: '原始文件名',
    example: 'report.pdf',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiPropertyOptional({
    description: '文件哈希值，用于秒传',
    example: 'e99a18c428cb38d5f260853678922e03',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  hash?: string;

  @ApiPropertyOptional({
    description: '业务模块标识',
    example: 'media-library',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  module?: string;

  @ApiPropertyOptional({
    description: '业务标签',
    example: 'video,training',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tags?: string;

  @ApiPropertyOptional({
    description: '是否公开访问',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
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
