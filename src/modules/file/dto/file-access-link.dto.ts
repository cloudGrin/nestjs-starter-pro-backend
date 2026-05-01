import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type FileAccessDisposition = 'inline' | 'attachment';

export class CreateFileAccessLinkDto {
  @ApiPropertyOptional({
    description: '访问方式：inline 用于预览，attachment 用于下载',
    enum: ['inline', 'attachment'],
    default: 'attachment',
  })
  @IsOptional()
  @IsIn(['inline', 'attachment'])
  disposition?: FileAccessDisposition;
}
