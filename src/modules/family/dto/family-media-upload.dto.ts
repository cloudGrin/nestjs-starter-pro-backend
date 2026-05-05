import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  CompleteDirectUploadDto,
  CreateDirectUploadDto,
} from '~/modules/file/dto/direct-upload.dto';
import { FamilyMediaTarget } from '../entities/family-media.types';

export class UploadFamilyMediaDto {
  @ApiProperty({
    description: '媒体使用场景',
    enum: FamilyMediaTarget,
  })
  @IsEnum(FamilyMediaTarget)
  target: FamilyMediaTarget;
}

export class CreateFamilyMediaDirectUploadDto extends CreateDirectUploadDto {
  @ApiProperty({
    description: '媒体使用场景',
    enum: FamilyMediaTarget,
  })
  @IsEnum(FamilyMediaTarget)
  target: FamilyMediaTarget;
}

export class CompleteFamilyMediaDirectUploadDto extends CompleteDirectUploadDto {}
