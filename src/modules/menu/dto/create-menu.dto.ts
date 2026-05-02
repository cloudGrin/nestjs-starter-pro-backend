import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MenuType } from '../entities/menu.entity';

export class CreateMenuDto {
  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: '菜单路径', example: '/system/users' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  path?: string;

  @ApiProperty({ description: '菜单类型', enum: MenuType, example: MenuType.MENU })
  @IsEnum(MenuType)
  type: MenuType;

  @ApiPropertyOptional({ description: '菜单图标', example: 'UserOutlined' })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  icon?: string;

  @ApiPropertyOptional({ description: '组件路径', example: '@/pages/system/users/index' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  component?: string;

  @ApiPropertyOptional({ description: '父菜单ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentId?: number;

  @ApiPropertyOptional({ description: '排序值', default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sort?: number;

  @ApiPropertyOptional({ description: '是否显示', default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否外链', default: false })
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
