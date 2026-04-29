import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt } from 'class-validator';

export class AssignUserRolesDto {
  @ApiProperty({
    description: '角色 ID 列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: '角色ID列表必须是数组' })
  @IsInt({ each: true, message: '角色ID必须是整数' })
  @Type(() => Number)
  roleIds: number[];
}
