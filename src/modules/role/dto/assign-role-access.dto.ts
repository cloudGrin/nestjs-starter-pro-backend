import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

export class AssignRoleAccessDto {
  @ApiProperty({
    description: '菜单 ID 列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: '菜单ID列表必须是数组' })
  @IsInt({ each: true, message: '菜单ID必须是整数' })
  @Type(() => Number)
  menuIds: number[];

  @ApiProperty({
    description: '权限 ID 列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: '权限ID列表必须是数组' })
  @IsInt({ each: true, message: '权限ID必须是整数' })
  @Type(() => Number)
  permissionIds: number[];
}
