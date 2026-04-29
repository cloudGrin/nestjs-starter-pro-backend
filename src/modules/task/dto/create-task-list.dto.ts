import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskListScope } from '../entities/task-list.entity';

export class CreateTaskListDto {
  @ApiProperty({
    description: '清单名称',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: '清单范围',
    enum: TaskListScope,
    default: TaskListScope.PERSONAL,
  })
  @IsOptional()
  @IsEnum(TaskListScope)
  scope?: TaskListScope;

  @ApiPropertyOptional({
    description: '清单颜色',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @ApiPropertyOptional({
    description: '排序值',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({
    description: '是否归档',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
