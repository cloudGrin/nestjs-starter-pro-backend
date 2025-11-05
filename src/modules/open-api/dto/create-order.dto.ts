import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: '客户ID', example: 'CUST-001' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '订单金额', example: 1999.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: '订单备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiPropertyOptional({ description: '订单元数据' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
