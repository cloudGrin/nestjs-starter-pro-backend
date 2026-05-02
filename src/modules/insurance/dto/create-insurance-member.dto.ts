import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateInsuranceMemberDto {
  @ApiProperty({ description: '成员姓名', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '家庭关系', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  relationship?: string | null;

  @ApiPropertyOptional({ description: '绑定的系统用户ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  linkedUserId?: number | null;

  @ApiPropertyOptional({ description: '备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string | null;

  @ApiPropertyOptional({ description: '排序值', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;
}
