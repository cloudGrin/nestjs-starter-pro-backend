import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateAutomationTaskConfigDto {
  @ApiPropertyOptional({
    description: '是否启用定时执行',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Cron 表达式',
  })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({
    description: '任务参数 JSON 对象',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
