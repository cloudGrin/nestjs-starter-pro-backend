import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsInt, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 批量更新菜单状态 DTO
 */
export class BatchUpdateMenuStatusDto {
  @ApiProperty({
    description: '菜单ID列表',
    type: [Number],
    example: [1, 2, 3, 4],
  })
  @IsArray({ message: '菜单ID列表必须是数组' })
  @ArrayNotEmpty({ message: '菜单ID列表不能为空' })
  @IsInt({ each: true, message: '菜单ID必须是整数' })
  @Type(() => Number)
  menuIds: number[];

  @ApiProperty({
    description: '是否启用',
    type: Boolean,
    example: true,
  })
  @IsBoolean({ message: 'isActive必须是布尔值' })
  isActive: boolean;
}
