import { ApiProperty } from '@nestjs/swagger';

export class UserPermissionsResponseDto {
  @ApiProperty({ description: '用户权限编码列表', type: [String] })
  permissions: string[];

  static of(permissions: string[]): UserPermissionsResponseDto {
    const response = new UserPermissionsResponseDto();
    response.permissions = permissions;
    return response;
  }
}
