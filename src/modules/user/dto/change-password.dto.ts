import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'OldP@ssw0rd',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: '新密码',
    example: 'NewP@ssw0rd123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&_-]+$/, {
    message: '密码必须包含大小写字母和数字',
  })
  newPassword: string;

  @ApiProperty({
    description: '确认新密码',
    example: 'NewP@ssw0rd123',
  })
  @IsString()
  confirmPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: '新密码',
    example: 'NewP@ssw0rd123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&_-]+$/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;
}
