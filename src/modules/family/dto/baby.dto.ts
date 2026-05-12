import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FamilyUserSummaryDto } from './family-response.dto';

export class SaveBabyProfileDto {
  @ApiProperty({ description: '宝宝昵称', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nickname: string;

  @ApiProperty({ description: '出生日期，YYYY-MM-DD' })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({ description: '出生时间，HH:mm 或 HH:mm:ss' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  birthTime?: string | null;

  @ApiPropertyOptional({ description: '头像文件ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  avatarFileId?: number | null;

  @ApiPropertyOptional({ description: '出生身高cm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(80)
  birthHeightCm?: number | null;

  @ApiPropertyOptional({ description: '出生体重kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(10)
  birthWeightKg?: number | null;
}

export class CreateBabyGrowthRecordDto {
  @ApiProperty({ description: '测量日期，YYYY-MM-DD' })
  @IsDateString()
  measuredAt: string;

  @ApiPropertyOptional({ description: '身高cm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(250)
  heightCm?: number | null;

  @ApiPropertyOptional({ description: '体重kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(250)
  weightKg?: number | null;

  @ApiPropertyOptional({ description: '备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string | null;
}

export class UpdateBabyGrowthRecordDto extends PartialType(CreateBabyGrowthRecordDto) {}

export class CreateBabyBirthdayDto {
  @ApiProperty({ description: '生日年份' })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiProperty({ description: '生日标题', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: '生日描述', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ description: '封面文件ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  coverFileId?: number | null;
}

export class UpdateBabyBirthdayDto extends PartialType(CreateBabyBirthdayDto) {}

export class CreateBabyBirthdayContributionDto {
  @ApiPropertyOptional({ description: '祝福内容', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string | null;

  @ApiPropertyOptional({ description: '生日图片文件ID列表，最多9张', type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mediaFileIds?: number[];
}

export interface BabyProfileResponseDto {
  id: number;
  nickname: string;
  birthDate: string;
  birthTime?: string | null;
  avatarFileId?: number | null;
  avatarUrl?: string | null;
  birthHeightCm?: number | null;
  birthWeightKg?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BabyGrowthRecordResponseDto {
  id: number;
  measuredAt: string;
  heightCm?: number | null;
  weightKg?: number | null;
  remark?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BabyBirthdayMediaResponseDto {
  id: number;
  fileId: number;
  contributionId?: number | null;
  uploaderId: number;
  uploader?: FamilyUserSummaryDto;
  sort: number;
  originalName?: string;
  mimeType?: string;
  size?: number;
  displayUrl: string;
  previewUrl?: string;
  expiresAt: string;
  createdAt?: Date;
}

export interface BabyBirthdayContributionResponseDto {
  id: number;
  birthdayId: number;
  authorId: number;
  author?: FamilyUserSummaryDto;
  content?: string | null;
  media: BabyBirthdayMediaResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BabyBirthdayResponseDto {
  id: number;
  year: number;
  title: string;
  description?: string | null;
  coverFileId?: number | null;
  coverUrl?: string | null;
  mediaCount: number;
  contributionCount: number;
  media: BabyBirthdayMediaResponseDto[];
  contributions: BabyBirthdayContributionResponseDto[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BabyOverviewResponseDto {
  profile: BabyProfileResponseDto | null;
  latestGrowthRecord: BabyGrowthRecordResponseDto | null;
  growthRecords: BabyGrowthRecordResponseDto[];
  birthdays: BabyBirthdayResponseDto[];
}
