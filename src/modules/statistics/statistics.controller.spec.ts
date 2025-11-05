import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { UserGrowthQueryDto } from './dto/user-growth.dto';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: jest.Mocked<StatisticsService>;

  const mockUserGrowthResponse = {
    data: [
      {
        date: '2025-10-25',
        totalUsers: 95,
        activeUsers: 30,
        newUsers: 5,
      },
      {
        date: '2025-10-26',
        totalUsers: 97,
        activeUsers: 32,
        newUsers: 2,
      },
      {
        date: '2025-10-27',
        totalUsers: 100,
        activeUsers: 35,
        newUsers: 3,
      },
    ],
    totalUsers: 100,
    growth: 8,
    growthRate: 8.7,
  };

  const mockRoleDistributionResponse = {
    data: [
      {
        roleCode: 'admin',
        roleName: '管理员',
        userCount: 50,
        percentage: 50,
      },
      {
        roleCode: 'user',
        roleName: '普通用户',
        userCount: 30,
        percentage: 30,
      },
      {
        roleCode: 'guest',
        roleName: '访客',
        userCount: 20,
        percentage: 20,
      },
    ],
    totalUsers: 100,
  };

  const mockDashboardOverviewResponse = {
    userGrowth: mockUserGrowthResponse,
    roleDistribution: mockRoleDistributionResponse,
    overview: {
      totalUsers: 100,
      activeUsers: 45,
      totalRoles: 3,
      totalMenus: 15,
    },
  };

  beforeEach(async () => {
    const mockService = {
      getUserGrowth: jest.fn(),
      getRoleDistribution: jest.fn(),
      getDashboardOverview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StatisticsController>(StatisticsController);
    service = module.get(StatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserGrowth', () => {
    it('应该返回用户增长统计', async () => {
      // Arrange
      const query: UserGrowthQueryDto = { days: 7 };
      service.getUserGrowth.mockResolvedValue(mockUserGrowthResponse);

      // Act
      const result = await controller.getUserGrowth(query);

      // Assert
      expect(result).toEqual(mockUserGrowthResponse);
      expect(service.getUserGrowth).toHaveBeenCalledWith(query);
      expect(service.getUserGrowth).toHaveBeenCalledTimes(1);
    });

    it('应该使用默认天数（7天）', async () => {
      // Arrange
      const query: UserGrowthQueryDto = {};
      service.getUserGrowth.mockResolvedValue(mockUserGrowthResponse);

      // Act
      await controller.getUserGrowth(query);

      // Assert
      expect(service.getUserGrowth).toHaveBeenCalledWith(query);
    });

    it('应该接受自定义天数', async () => {
      // Arrange
      const query: UserGrowthQueryDto = { days: 30 };
      service.getUserGrowth.mockResolvedValue({
        ...mockUserGrowthResponse,
        data: new Array(30).fill(mockUserGrowthResponse.data[0]),
      });

      // Act
      const result = await controller.getUserGrowth(query);

      // Assert
      expect(service.getUserGrowth).toHaveBeenCalledWith({ days: 30 });
      expect(result.data.length).toBe(30);
    });
  });

  describe('getRoleDistribution', () => {
    it('应该返回角色分布统计', async () => {
      // Arrange
      service.getRoleDistribution.mockResolvedValue(mockRoleDistributionResponse);

      // Act
      const result = await controller.getRoleDistribution();

      // Assert
      expect(result).toEqual(mockRoleDistributionResponse);
      expect(service.getRoleDistribution).toHaveBeenCalledWith();
      expect(service.getRoleDistribution).toHaveBeenCalledTimes(1);
    });

    it('返回的数据应该包含正确的字段', async () => {
      // Arrange
      service.getRoleDistribution.mockResolvedValue(mockRoleDistributionResponse);

      // Act
      const result = await controller.getRoleDistribution();

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('totalUsers');
      expect(result.data[0]).toHaveProperty('roleCode');
      expect(result.data[0]).toHaveProperty('roleName');
      expect(result.data[0]).toHaveProperty('userCount');
      expect(result.data[0]).toHaveProperty('percentage');
    });
  });

  describe('getDashboardOverview', () => {
    it('应该返回Dashboard总览数据', async () => {
      // Arrange
      service.getDashboardOverview.mockResolvedValue(mockDashboardOverviewResponse);

      // Act
      const result = await controller.getDashboardOverview();

      // Assert
      expect(result).toEqual(mockDashboardOverviewResponse);
      expect(service.getDashboardOverview).toHaveBeenCalledWith();
      expect(service.getDashboardOverview).toHaveBeenCalledTimes(1);
    });

    it('返回的数据应该包含所有必要字段', async () => {
      // Arrange
      service.getDashboardOverview.mockResolvedValue(mockDashboardOverviewResponse);

      // Act
      const result = await controller.getDashboardOverview();

      // Assert
      expect(result).toHaveProperty('userGrowth');
      expect(result).toHaveProperty('roleDistribution');
      expect(result).toHaveProperty('overview');
      expect(result.overview).toHaveProperty('totalUsers');
      expect(result.overview).toHaveProperty('activeUsers');
      expect(result.overview).toHaveProperty('totalRoles');
      expect(result.overview).toHaveProperty('totalMenus');
    });

    it('总览数据应该是整合的结果', async () => {
      // Arrange
      service.getDashboardOverview.mockResolvedValue(mockDashboardOverviewResponse);

      // Act
      const result = await controller.getDashboardOverview();

      // Assert
      expect(result.overview.totalUsers).toBe(result.userGrowth.totalUsers);
      expect(result.overview.totalRoles).toBe(result.roleDistribution.data.length);
    });
  });
});
