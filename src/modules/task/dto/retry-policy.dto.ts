import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * 重试策略配置
 */
export class RetryPolicyDto {
  @ApiProperty({ description: '是否启用重试', default: false })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: '最大重试次数', default: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  maxRetries: number;

  @ApiProperty({ description: '初始重试延迟（毫秒）', default: 60000, minimum: 1000 })
  @IsInt()
  @Min(1000)
  retryDelay: number;

  @ApiPropertyOptional({ description: '退避倍数（指数退避）', default: 2, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  backoffMultiplier?: number;
}
