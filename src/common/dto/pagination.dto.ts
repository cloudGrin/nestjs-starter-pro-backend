import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, IsIn, IsString } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    description: '页码',
    minimum: 1,
    default: 1,
    required: false,
  })
  @Type(() => Number)
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: '排序字段',
    required: false,
  })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiProperty({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
    required: false,
  })
  @IsIn(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'ASC';
}
