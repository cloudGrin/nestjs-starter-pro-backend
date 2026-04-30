import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
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

  @ApiProperty({
    description: '拖拽落点目标菜单ID',
    type: Number,
    required: false,
    example: 8,
  })
  @IsOptional()
  @IsInt({ message: '目标菜单ID必须是整数' })
  @Type(() => Number)
  targetId?: number;

  @ApiProperty({
    description: '相对目标菜单的位置',
    enum: ['before', 'after', 'inside'],
    required: false,
    example: 'after',
  })
  @IsOptional()
  @IsEnum(['before', 'after', 'inside'], { message: '移动位置必须是 before、after 或 inside' })
  position?: 'before' | 'after' | 'inside';
}
