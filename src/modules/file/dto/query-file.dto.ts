import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';
import { FileStorageType } from '../entities/file.entity';

export class QueryFileDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '模糊搜索关键字（原始名或存储名）',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '存储类型过滤',
    enum: FileStorageType,
  })
  @IsOptional()
  @IsEnum(FileStorageType)
  storage?: FileStorageType;

  @ApiPropertyOptional({
    description: '文件类别过滤',
    example: 'image',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    description: '业务模块过滤',
    example: 'user-avatar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  module?: string;

  @ApiPropertyOptional({
    description: '是否公开访问',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublic?: boolean;
}
