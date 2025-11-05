import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserGrowthQueryDto, UserGrowthResponseDto } from './dto/user-growth.dto';
import { RoleDistributionResponseDto } from './dto/role-distribution.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview.dto';

@ApiTags('统计分析')
@Controller('statistics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('user-growth')
  @ApiOperation({ summary: '获取用户增长统计' })
  @ApiResponse({
    status: 200,
    description: '用户增长统计数据',
    type: UserGrowthResponseDto,
  })
  async getUserGrowth(@Query() query: UserGrowthQueryDto): Promise<UserGrowthResponseDto> {
    return await this.statisticsService.getUserGrowth(query);
  }

  @Get('role-distribution')
  @ApiOperation({ summary: '获取角色分布统计' })
  @ApiResponse({
    status: 200,
    description: '角色分布统计数据',
    type: RoleDistributionResponseDto,
  })
  async getRoleDistribution(): Promise<RoleDistributionResponseDto> {
    return await this.statisticsService.getRoleDistribution();
  }

  @Get('overview')
  @ApiOperation({ summary: '获取Dashboard总览数据' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard总览数据（一次性返回所有统计）',
    type: DashboardOverviewResponseDto,
  })
  async getDashboardOverview(): Promise<DashboardOverviewResponseDto> {
    return await this.statisticsService.getDashboardOverview();
  }
}
