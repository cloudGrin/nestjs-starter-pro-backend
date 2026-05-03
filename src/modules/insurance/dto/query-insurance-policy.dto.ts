import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';
import { InsurancePolicyType } from '../entities/insurance-policy.entity';

export class QueryInsurancePolicyDto extends PaginationDto {
  @ApiPropertyOptional({ description: '成员ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberId?: number;

  @ApiPropertyOptional({ description: '险种', enum: InsurancePolicyType })
  @IsOptional()
  @IsEnum(InsurancePolicyType)
  type?: InsurancePolicyType;

  @ApiPropertyOptional({ description: '关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '是否返回提醒记录' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeReminders?: boolean;
}
