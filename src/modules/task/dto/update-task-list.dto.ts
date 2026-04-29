import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TaskListScope } from '../entities/task-list.entity';

const IsProvided = () => ValidateIf((_object, value) => value !== undefined);

export class UpdateTaskListDto {
  @ApiPropertyOptional({
    description: '清单名称',
    maxLength: 100,
  })
  @IsProvided()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: '清单名称不能为空' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: '清单范围',
    enum: TaskListScope,
  })
  @IsProvided()
  @IsEnum(TaskListScope)
  scope?: TaskListScope;

  @ApiPropertyOptional({
    description: '清单颜色',
    maxLength: 30,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string | null;

  @ApiPropertyOptional({
    description: '排序值',
  })
  @IsProvided()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({
    description: '是否归档',
  })
  @IsProvided()
  @IsBoolean()
  isArchived?: boolean;
}
