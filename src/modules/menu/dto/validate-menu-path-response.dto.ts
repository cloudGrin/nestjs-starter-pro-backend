import { ApiProperty } from '@nestjs/swagger';

export class ValidateMenuPathResponseDto {
  @ApiProperty({ description: '菜单路径是否唯一' })
  isUnique: boolean;

  static of(isUnique: boolean): ValidateMenuPathResponseDto {
    const response = new ValidateMenuPathResponseDto();
    response.isUnique = isUnique;
    return response;
  }
}
