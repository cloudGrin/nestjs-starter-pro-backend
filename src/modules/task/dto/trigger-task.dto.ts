import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class TriggerTaskDto {
  @ApiPropertyOptional({ description: '执行参数覆盖', type: Object })
  @IsOptional()
  payload?: Record<string, unknown>;
}
