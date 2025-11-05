import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatisticsService } from './statistics.service';
import { UserEntity } from '../user/entities/user.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuEntity } from '../menu/entities/menu.entity';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let roleRepository: jest.Mocked<Repository<RoleEntity>>;
  let menuRepository: jest.Mocked<Repository<MenuEntity>>;

  // Mock QueryBuilder
  const createMockQueryBuilder = () => {
    const queryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    return queryBuilder;
  };

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
    };

    const mockRoleRepository = {
      createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
    };

    const mockMenuRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(MenuEntity),
          useValue: mockMenuRepository,
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    menuRepository = module.get(getRepositoryToken(MenuEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserGrowth', () => {
    it('应该返回用户增长统计（默认7天）', async () => {
      // Arrange
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.getUserGrowth({ days: 7 });

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(7);
      expect(result.totalUsers).toBe(100);
      expect(result).toHaveProperty('growth');
      expect(result).toHaveProperty('growthRate');
      expect(userRepository.count).toHaveBeenCalled();
    });

    it('应该返回用户增长统计（自定义天数）', async () => {
      // Arrange
      userRepository.count.mockResolvedValue(50);

      // Act
      const result = await service.getUserGrowth({ days: 30 });

      // Assert
      expect(result.data).toHaveLength(30);
      expect(result.totalUsers).toBe(50);
    });

    it('应该正确计算增长率', async () => {
      // Arrange
      // 第一次调用：总用户数 100
      // 中间调用：每天的用户统计
      // 最后一次调用：上一周期的用户数 80
      userRepository.count
        .mockResolvedValueOnce(100) // 总用户数
        .mockResolvedValue(0); // 其他调用默认返回0

      // Act
      const result = await service.getUserGrowth({ days: 7 });

      // Assert
      expect(result.growth).toBeDefined();
      expect(result.growthRate).toBeDefined();
      expect(typeof result.growthRate).toBe('number');
    });

    it('数据点应该包含正确的字段', async () => {
      // Arrange
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.getUserGrowth({ days: 7 });

      // Assert
      const dataPoint = result.data[0];
      expect(dataPoint).toHaveProperty('date');
      expect(dataPoint).toHaveProperty('totalUsers');
      expect(dataPoint).toHaveProperty('activeUsers');
      expect(dataPoint).toHaveProperty('newUsers');
      expect(dataPoint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD 格式
    });
  });

  describe('getRoleDistribution', () => {
    it('应该返回角色分布统计', async () => {
      // Arrange
      const mockRoles = [
        { roleCode: 'admin', roleName: '管理员', userCount: '50' },
        { roleCode: 'user', roleName: '普通用户', userCount: '30' },
        { roleCode: 'guest', roleName: '访客', userCount: '20' },
      ];

      userRepository.count.mockResolvedValue(100);
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getRoleDistribution();

      // Assert
      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(100);
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({
        roleCode: 'admin',
        roleName: '管理员',
        userCount: 50,
        percentage: 50,
      });
    });

    it('应该按用户数量降序排序', async () => {
      // Arrange
      const mockRoles = [
        { roleCode: 'user', roleName: '普通用户', userCount: '30' },
        { roleCode: 'admin', roleName: '管理员', userCount: '50' },
        { roleCode: 'guest', roleName: '访客', userCount: '20' },
      ];

      userRepository.count.mockResolvedValue(100);
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getRoleDistribution();

      // Assert
      expect(result.data[0].userCount).toBeGreaterThanOrEqual(result.data[1].userCount);
      expect(result.data[1].userCount).toBeGreaterThanOrEqual(result.data[2].userCount);
    });

    it('应该正确计算百分比', async () => {
      // Arrange
      const mockRoles = [
        { roleCode: 'admin', roleName: '管理员', userCount: '25' },
        { roleCode: 'user', roleName: '普通用户', userCount: '75' },
      ];

      userRepository.count.mockResolvedValue(100);
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getRoleDistribution();

      // Assert
      const adminRole = result.data.find(r => r.roleCode === 'admin');
      const userRole = result.data.find(r => r.roleCode === 'user');
      expect(adminRole?.percentage).toBe(25);
      expect(userRole?.percentage).toBe(75);
    });

    it('当没有用户时应该返回0%', async () => {
      // Arrange
      const mockRoles = [
        { roleCode: 'admin', roleName: '管理员', userCount: '0' },
      ];

      userRepository.count.mockResolvedValue(0);
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getRoleDistribution();

      // Assert
      expect(result.totalUsers).toBe(0);
      expect(result.data[0].percentage).toBe(0);
    });
  });

  describe('getDashboardOverview', () => {
    it('应该返回完整的Dashboard总览数据', async () => {
      // Arrange
      userRepository.count.mockResolvedValue(100);
      menuRepository.count.mockResolvedValue(20);

      const mockRoles = [
        { roleCode: 'admin', roleName: '管理员', userCount: '50' },
      ];
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getDashboardOverview();

      // Assert
      expect(result).toBeDefined();
      expect(result.userGrowth).toBeDefined();
      expect(result.roleDistribution).toBeDefined();
      expect(result.overview).toBeDefined();
      expect(result.overview).toMatchObject({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        totalRoles: expect.any(Number),
        totalMenus: 20,
      });
    });

    it('应该并行获取所有数据', async () => {
      // Arrange
      userRepository.count.mockResolvedValue(100);
      menuRepository.count.mockResolvedValue(15);

      const mockRoles = [
        { roleCode: 'admin', roleName: '管理员', userCount: '30' },
        { roleCode: 'user', roleName: '普通用户', userCount: '70' },
      ];
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.getRawMany.mockResolvedValue(mockRoles);
      roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getDashboardOverview();

      // Assert
      expect(result.overview.totalRoles).toBe(2);
      expect(result.overview.totalMenus).toBe(15);
      expect(menuRepository.count).toHaveBeenCalled();
    });
  });
});
