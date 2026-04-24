import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class DeleteUsersDto {
  @ApiProperty({
    description: '用户 ID 列表',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: '用户ID列表必须是数组' })
  @ArrayNotEmpty({ message: '用户ID列表不能为空' })
  @IsInt({ each: true, message: '用户ID必须是整数' })
  @Type(() => Number)
  ids: number[];
}
