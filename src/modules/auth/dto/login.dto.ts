import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: '用户名或邮箱',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({
    description: '密码',
    example: 'P@ssw0rd123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: '验证码ID', example: 'login:1700000000000:abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  captchaId?: string;

  @ApiPropertyOptional({ description: '验证码内容', example: 'a1b2' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  captchaCode?: string;
}
