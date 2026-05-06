import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  InsurancePaymentFrequency,
  InsurancePolicyType,
} from '../entities/insurance-policy.entity';

export class CreateInsurancePolicyDto {
  @ApiProperty({ description: '保单名称', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: '保险公司', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string | null;

  @ApiPropertyOptional({ description: '保单号', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  policyNo?: string | null;

  @ApiProperty({ description: '归属成员ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  memberId: number;

  @ApiProperty({ description: '险种', enum: InsurancePolicyType })
  @IsEnum(InsurancePolicyType)
  type: InsurancePolicyType;

  @ApiPropertyOptional({ description: '生效日期' })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string | null;

  @ApiPropertyOptional({ description: '到期日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ description: '下次缴费日期' })
  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string | null;

  @ApiPropertyOptional({ description: '缴费金额' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paymentAmount?: number | null;

  @ApiPropertyOptional({ description: '缴费周期', enum: InsurancePaymentFrequency })
  @IsOptional()
  @IsEnum(InsurancePaymentFrequency)
  paymentFrequency?: InsurancePaymentFrequency | null;

  @ApiPropertyOptional({ description: '支付渠道', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentChannel?: string | null;

  @ApiPropertyOptional({ description: '购买渠道', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseChannel?: string | null;

  @ApiPropertyOptional({ description: '是否开启续费提醒', default: true })
  @IsOptional()
  @IsBoolean()
  paymentReminderEnabled?: boolean;

  @ApiPropertyOptional({ description: '负责人用户ID；不传时使用创建人' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownerUserId?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string | null;

  @ApiPropertyOptional({ description: '附件文件ID', type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentFileIds?: number[];
}
