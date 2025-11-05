import { ApiProperty } from '@nestjs/swagger';
import { UserGrowthResponseDto } from './user-growth.dto';
import { RoleDistributionResponseDto } from './role-distribution.dto';

/**
 * Dashboard总览统计响应
 * 一次性返回Dashboard所需的所有数据
 */
export class DashboardOverviewResponseDto {
  @ApiProperty({ description: '用户增长数据', type: UserGrowthResponseDto })
  userGrowth: UserGrowthResponseDto;

  @ApiProperty({
    description: '角色分布数据',
    type: RoleDistributionResponseDto,
  })
  roleDistribution: RoleDistributionResponseDto;

  @ApiProperty({
    description: '统计概览',
    type: Object,
    example: {
      totalUsers: 62,
      activeUsers: 45,
      totalRoles: 3,
      totalMenus: 15,
    },
  })
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    totalMenus: number;
  };
}
