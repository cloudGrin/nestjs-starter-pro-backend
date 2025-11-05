import { ApiProperty } from '@nestjs/swagger';

/**
 * 角色分布数据点
 */
export class RoleDistributionDataPoint {
  @ApiProperty({ description: '角色代码', example: 'super_admin' })
  roleCode: string;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  roleName: string;

  @ApiProperty({ description: '用户数量', example: 15 })
  userCount: number;

  @ApiProperty({ description: '占比(%)', example: 24.2 })
  percentage: number;
}

/**
 * 角色分布统计响应
 */
export class RoleDistributionResponseDto {
  @ApiProperty({
    description: '角色分布数据',
    type: [RoleDistributionDataPoint],
  })
  data: RoleDistributionDataPoint[];

  @ApiProperty({ description: '总用户数', example: 62 })
  totalUsers: number;
}
