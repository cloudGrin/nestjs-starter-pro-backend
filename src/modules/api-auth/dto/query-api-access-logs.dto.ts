import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';

export class QueryApiAccessLogsDto extends PaginationDto {
  @ApiProperty({
    description: 'API 密钥 ID',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  keyId?: number;

  @ApiProperty({
    description: '请求路径关键字',
    required: false,
  })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiProperty({
    description: 'HTTP 状态码',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  @IsOptional()
  statusCode?: number;
}
