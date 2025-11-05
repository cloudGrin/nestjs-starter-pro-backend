import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 移除角色的菜单 DTO
 */
export class RevokeMenusDto {
  @ApiProperty({
    description: '要移除的菜单ID列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: '菜单ID列表必须是数组' })
  @ArrayNotEmpty({ message: '菜单ID列表不能为空' })
  @IsInt({ each: true, message: '菜单ID必须是整数' })
  @Type(() => Number)
  menuIds: number[];
}
