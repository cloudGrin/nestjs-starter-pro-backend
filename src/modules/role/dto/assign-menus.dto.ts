import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分配菜单给角色 DTO
 */
export class AssignMenusDto {
  @ApiProperty({
    description: '菜单ID列表',
    type: [Number],
    example: [1, 2, 3, 4, 5],
  })
  @IsArray({ message: '菜单ID列表必须是数组' })
  @IsInt({ each: true, message: '菜单ID必须是整数' })
  @Type(() => Number)
  menuIds: number[];
}
