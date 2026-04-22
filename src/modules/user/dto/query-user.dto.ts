import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsEmail } from 'class-validator';
import { PaginationDto } from '~/common/dto/pagination.dto';
import { UserStatus, UserGender } from '~/common/enums/user.enum';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '用户名（模糊查询）',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: '邮箱（模糊查询）',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: '手机号（模糊查询）',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: '真实姓名（模糊查询）',
  })
  @IsOptional()
  @IsString()
  realName?: string;

  @ApiPropertyOptional({
    description: '状态',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: '性别',
    enum: UserGender,
  })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiPropertyOptional({
    description: '角色ID',
    type: Number,
  })
  @IsOptional()
  roleId?: number;
}
