import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 移动菜单 DTO
 */
export class MoveMenuDto {
  @ApiProperty({
    description: '目标父菜单ID（null表示移动到根级）',
    type: Number,
    required: false,
    nullable: true,
    example: 5,
  })
  @IsOptional()
  @IsInt({ message: '目标父菜单ID必须是整数' })
  @Type(() => Number)
  targetParentId?: number | null;
}
