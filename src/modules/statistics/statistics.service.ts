import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual, LessThan, MoreThanOrEqual } from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuEntity } from '../menu/entities/menu.entity';
import {
  UserGrowthQueryDto,
  UserGrowthResponseDto,
  UserGrowthDataPoint,
} from './dto/user-growth.dto';
import {
  RoleDistributionResponseDto,
  RoleDistributionDataPoint,
} from './dto/role-distribution.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview.dto';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
  ) {}

  /**
   * 获取用户增长统计
   * @param query 查询参数（统计天数）
   * @returns 用户增长数据
   */
  async getUserGrowth(
    query: UserGrowthQueryDto,
  ): Promise<UserGrowthResponseDto> {
    const { days = 7 } = query;

    // 1. 获取总用户数
    const totalUsers = await this.userRepository.count({
      where: { deletedAt: IsNull() },
    });

    // 2. 计算日期范围
    const dataPoints: UserGrowthDataPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3. 获取每天的用户增长数据
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      // 截止到当天的总用户数
      const totalUpToDate = await this.userRepository.count({
        where: {
          createdAt: LessThanOrEqual(nextDate),
          deletedAt: IsNull(),
        },
      });

      // 当天新增用户数
      const newUsersCount = await this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(date),
          deletedAt: IsNull(),
        },
      });

      // 活跃用户数（最近7天内登录过的用户）
      const sevenDaysAgo = new Date(date);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const activeUsers = await this.userRepository.count({
        where: {
          lastLoginAt: MoreThanOrEqual(sevenDaysAgo),
          deletedAt: IsNull(),
        },
      });

      dataPoints.push({
        date: this.formatDate(date),
        totalUsers: totalUpToDate,
        activeUsers,
        newUsers: newUsersCount,
      });
    }

    // 4. 计算增长率
    const previousPeriodStart = new Date(today);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);
    const previousPeriodEnd = new Date(today);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

    const previousTotalUsers = await this.userRepository.count({
      where: {
        createdAt: LessThan(previousPeriodEnd),
        deletedAt: IsNull(),
      },
    });

    const growth = totalUsers - previousTotalUsers;
    const growthRate =
      previousTotalUsers > 0
        ? Number(((growth / previousTotalUsers) * 100).toFixed(2))
        : 0;

    return {
      data: dataPoints,
      totalUsers,
      growth,
      growthRate,
    };
  }

  /**
   * 获取角色分布统计
   * @returns 角色分布数据
   */
  async getRoleDistribution(): Promise<RoleDistributionResponseDto> {
    // 1. 获取总用户数
    const totalUsers = await this.userRepository.count({
      where: { deletedAt: IsNull() },
    });

    // 2. 获取所有角色及其用户数
    const roles = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.users', 'user')
      .where('role.deletedAt IS NULL')
      .andWhere('user.deletedAt IS NULL')
      .select([
        'role.id as roleId',
        'role.code as roleCode',
        'role.name as roleName',
        'COUNT(DISTINCT user.id) as userCount',
      ])
      .groupBy('role.id')
      .addGroupBy('role.code')
      .addGroupBy('role.name')
      .getRawMany();

    // 3. 计算每个角色的占比
    const data: RoleDistributionDataPoint[] = roles.map((role) => {
      const userCount = Number(role.userCount || 0);
      const percentage =
        totalUsers > 0 ? Number(((userCount / totalUsers) * 100).toFixed(2)) : 0;

      return {
        roleCode: role.roleCode,
        roleName: role.roleName,
        userCount,
        percentage,
      };
    });

    // 4. 按用户数量降序排序
    data.sort((a, b) => b.userCount - a.userCount);

    return {
      data,
      totalUsers,
    };
  }

  /**
   * 获取Dashboard总览数据
   * 一次性返回所有Dashboard需要的数据
   * @returns Dashboard总览数据
   */
  async getDashboardOverview(): Promise<DashboardOverviewResponseDto> {
    // 并行获取所有数据
    const [userGrowth, roleDistribution, totalMenus, sevenDaysAgo] = await Promise.all([
      this.getUserGrowth({ days: 7 }),
      this.getRoleDistribution(),
      this.menuRepository.count({ where: { deletedAt: IsNull() } }),
      Promise.resolve((() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date;
      })()),
    ]);

    // 统计活跃用户数（最近7天登录）
    const activeUsers = await this.userRepository.count({
      where: {
        lastLoginAt: MoreThanOrEqual(sevenDaysAgo),
        deletedAt: IsNull(),
      },
    });

    return {
      userGrowth,
      roleDistribution,
      overview: {
        totalUsers: userGrowth.totalUsers,
        activeUsers,
        totalRoles: roleDistribution.data.length,
        totalMenus,
      },
    };
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
