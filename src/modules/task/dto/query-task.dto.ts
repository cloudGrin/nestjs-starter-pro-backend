import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';
import { TaskStatus } from '../entities/task.entity';

export enum TaskQueryView {
  LIST = 'list',
  TODAY = 'today',
  CALENDAR = 'calendar',
  MATRIX = 'matrix',
  ANNIVERSARY = 'anniversary',
}

function toTagList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

export class QueryTaskDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '任务视图',
    enum: TaskQueryView,
    default: TaskQueryView.LIST,
  })
  @IsOptional()
  @IsEnum(TaskQueryView)
  view?: TaskQueryView = TaskQueryView.LIST;

  @ApiPropertyOptional({
    description: '任务ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  taskId?: number;

  @ApiPropertyOptional({
    description: '清单ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listId?: number;

  @ApiPropertyOptional({
    description: '负责人ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @ApiPropertyOptional({
    description: '任务状态',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: '开始日期',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: '结束日期',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: '关键字',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '标签，支持逗号分隔',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => toTagList(value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
