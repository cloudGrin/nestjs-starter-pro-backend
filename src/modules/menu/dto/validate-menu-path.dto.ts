import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class ValidateMenuPathDto {
  @ApiProperty({ description: '菜单路径', example: '/system/users' })
  @IsString()
  @Length(1, 200)
  path: string;

  @ApiPropertyOptional({
    description: '排除的菜单ID(更新时使用)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  excludeId?: number;
}
