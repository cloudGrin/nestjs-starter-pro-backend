import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class TaskCheckItemInputDto {
  @ApiPropertyOptional({
    description: '检查项ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiPropertyOptional({
    description: '检查项标题',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: '检查项标题不能为空' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: '是否完成',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: '排序值',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sort?: number;
}
