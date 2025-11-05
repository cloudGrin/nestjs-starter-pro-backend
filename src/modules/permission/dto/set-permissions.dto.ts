import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SetPermissionsDto {
  @ApiProperty({ description: '权限ID列表', type: [Number], example: [1, 2, 3, 4, 5] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds: number[];
}
