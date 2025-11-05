import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 用户增长统计查询DTO
 */
export class UserGrowthQueryDto {
  @ApiProperty({
    description: '统计天数',
    example: 7,
    default: 7,
    minimum: 1,
    maximum: 365,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days必须是整数' })
  @Min(1, { message: 'days最小值为1' })
  @Max(365, { message: 'days最大值为365' })
  days?: number = 7;
}

/**
 * 用户增长数据点
 */
export class UserGrowthDataPoint {
  @ApiProperty({ description: '日期', example: '2025-10-31' })
  date: string;

  @ApiProperty({ description: '总用户数', example: 45 })
  totalUsers: number;

  @ApiProperty({ description: '活跃用户数', example: 32 })
  activeUsers: number;

  @ApiProperty({ description: '新增用户数', example: 5 })
  newUsers: number;
}

/**
 * 用户增长统计响应
 */
export class UserGrowthResponseDto {
  @ApiProperty({
    description: '增长数据点数组',
    type: [UserGrowthDataPoint],
  })
  data: UserGrowthDataPoint[];

  @ApiProperty({ description: '总用户数', example: 62 })
  totalUsers: number;

  @ApiProperty({ description: '对比前一周期增长数', example: 8 })
  growth: number;

  @ApiProperty({ description: '增长率(%)', example: 14.8 })
  growthRate: number;
}
