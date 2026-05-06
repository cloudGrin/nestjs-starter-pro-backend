import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class MarkFamilyPostsReadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId?: number;
}

export class MarkFamilyChatReadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  messageId?: number;
}
