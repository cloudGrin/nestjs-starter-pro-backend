import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFamilyChatMessageDto {
  @ApiPropertyOptional({
    description: '消息文字内容',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    description: '图片/视频文件ID列表，最多9个',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mediaFileIds?: number[];
}
