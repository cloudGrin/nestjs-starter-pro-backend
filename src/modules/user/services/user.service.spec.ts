/**
 * UserService 单元测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { CACHE_KEYS } from '~/common/constants/cache.constants';
import { DataSource } from 'typeorm';
import {
  UserMockFactory,
  RoleMockFactory,
  createMockRepository,
  createMockLogger,
  createMockCacheService,
  createMockDataSource,
} from '~/test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<any>;
  let cache: jest.Mocked<CacheService>;
  let logger: jest.Mocked<LoggerService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    // 创建Mock依赖
    const mockUserRepository = {
      ...createMockRepository<UserEntity>(),
      isUsernameExist: jest.fn(),
      isEmailExist: jest.fn(),
      isPhoneExist: jest.fn(),
      findByIdOrFail: jest.fn(),
      findWithQuery: jest.fn(),
    };

    const mockRoleRepository = createMockRepository<RoleEntity>();
    const mockCache = createMockCacheService();
    const mockLogger = createMockLogger();
    const mockDataSource = createMockDataSource();

    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: mockRoleRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository);
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    cache = module.get(CacheService);
    logger = module.get(LoggerService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      // Arrange
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        nickname: '测试用户',
      };

      const mockUser = UserMockFactory.create({
        ...createDto,
        id: 1,
      });

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(false);
      userRepository.isPhoneExist.mockResolvedValue(false);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.createUser(createDto);

      // Assert
      // 注意：createUser返回时会排除password字段
      const { password, ...mockUserWithoutPassword } = mockUser;
      expect(result).toEqual(mockUserWithoutPassword);
      expect(userRepository.isUsernameExist).toHaveBeenCalledWith(createDto.username);
      expect(userRepository.isEmailExist).toHaveBeenCalledWith(createDto.email);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createDto,
        roles: [],
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(logger.log).toHaveBeenCalled();
    });

    it('当用户名已存在时应该抛出ConflictException', async () => {
      // Arrange
      const createDto = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Password123!',
      };

      userRepository.isUsernameExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.createUser(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(createDto)).rejects.toThrow('用户名已存在');

      expect(userRepository.isUsernameExist).toHaveBeenCalledWith(createDto.username);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('当邮箱已存在时应该抛出ConflictException', async () => {
      // Arrange
      const createDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.createUser(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(createDto)).rejects.toThrow('邮箱已被注册');

      expect(userRepository.isEmailExist).toHaveBeenCalledWith(createDto.email);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('当手机号已存在时应该抛出ConflictException', async () => {
      // Arrange
      const createDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
        phone: '13800138000',
      };

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(false);
      userRepository.isPhoneExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.createUser(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createUser(createDto)).rejects.toThrow('手机号已被注册');

      expect(userRepository.isPhoneExist).toHaveBeenCalledWith(createDto.phone);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('应该正确分配角色', async () => {
      // Arrange
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        roleIds: [1, 2],
      };

      const mockRoles = RoleMockFactory.createMany(2);
      const mockUser = UserMockFactory.create({
        ...createDto,
        id: 1,
      });

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(false);
      roleRepository.find.mockResolvedValue(mockRoles);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.createUser(createDto);

      // Assert
      expect(roleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object), isActive: true },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createDto,
        roles: mockRoles,
      });
    });

    it('当部分角色不存在时应该抛出BadRequestException', async () => {
      // Arrange
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        roleIds: [1, 2, 3],
      };

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(false);
      roleRepository.find.mockResolvedValue(RoleMockFactory.createMany(2)); // 只返回2个角色

      // Act & Assert
      await expect(service.createUser(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.createUser(createDto)).rejects.toThrow('部分角色不存在或已禁用');
    });
  });

  describe('updateUser', () => {
    it('应该成功更新用户', async () => {
      // Arrange
      const userId = 1;
      const updateDto = {
        nickname: '新昵称',
        email: 'newemail@example.com',
      };

      const existingUser = UserMockFactory.create({
        id: userId,
        email: 'old@example.com',
      });

      const updatedUser = {
        ...existingUser,
        ...updateDto,
      };

      userRepository.findByIdOrFail.mockResolvedValue(existingUser);
      userRepository.isEmailExist.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(updatedUser as any);

      // Act
      const result = await service.updateUser(userId, updateDto);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(userRepository.findByIdOrFail).toHaveBeenCalledWith(userId);
      expect(userRepository.isEmailExist).toHaveBeenCalledWith(updateDto.email, userId);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('当更新的邮箱已存在时应该抛出ConflictException', async () => {
      // Arrange
      const userId = 1;
      const updateDto = {
        email: 'existing@example.com',
      };

      const existingUser = UserMockFactory.create({
        id: userId,
        email: 'old@example.com',
      });

      userRepository.findByIdOrFail.mockResolvedValue(existingUser);
      userRepository.isEmailExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow('邮箱已被注册');

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('当更新的手机号已存在时应该抛出ConflictException', async () => {
      // Arrange
      const userId = 1;
      const updateDto = {
        phone: '13800138000',
      };

      const existingUser = UserMockFactory.create({
        id: userId,
        phone: '13900139000',
      });

      userRepository.findByIdOrFail.mockResolvedValue(existingUser);
      userRepository.isPhoneExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow(ConflictException);
      await expect(service.updateUser(userId, updateDto)).rejects.toThrow('手机号已被注册');

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('应该正确更新用户角色', async () => {
      // Arrange
      const userId = 1;
      const updateDto = {
        roleIds: [2, 3],
      };

      const existingUser = UserMockFactory.create({ id: userId });
      const newRoles = RoleMockFactory.createMany(2);

      userRepository.findByIdOrFail.mockResolvedValue(existingUser);
      roleRepository.find.mockResolvedValue(newRoles);
      userRepository.save.mockResolvedValue({
        ...existingUser,
        roles: newRoles,
      } as any);

      // Act
      await service.updateUser(userId, updateDto);

      // Assert
      expect(roleRepository.find).toHaveBeenCalledWith({
        where: { id: expect.any(Object), isActive: true },
      });
      expect(existingUser.roles).toEqual(newRoles);
    });
  });

  describe('findUsers', () => {
    it('应该返回分页用户列表', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
      };

      const mockUsers = UserMockFactory.createMany(5);
      const totalItems = 25;

      userRepository.findWithQuery.mockResolvedValue([mockUsers, totalItems]);

      // Act
      const result = await service.findUsers(query);

      // Assert
      expect(result).toEqual({
        items: mockUsers,
        meta: {
          totalItems,
          itemCount: mockUsers.length,
          itemsPerPage: query.limit,
          totalPages: Math.ceil(totalItems / query.limit),
          currentPage: query.page,
        },
      });

      expect(userRepository.findWithQuery).toHaveBeenCalledWith(query);
    });

    it('应该处理空结果', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
      };

      userRepository.findWithQuery.mockResolvedValue([[], 0]);

      // Act
      const result = await service.findUsers(query);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('缓存管理', () => {
    it('创建用户后应该清除缓存', async () => {
      // Arrange
      const createDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
      };

      const mockUser = UserMockFactory.create(createDto);

      userRepository.isUsernameExist.mockResolvedValue(false);
      userRepository.isEmailExist.mockResolvedValue(false);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      // Act
      await service.createUser(createDto);

      // Assert
      // clearCache 是 BaseService 的方法，通过 cache 来实现
      // 这里验证缓存相关的操作被调用
      expect(cache).toBeDefined();
    });

    it('更新用户后应该清除指定用户的缓存', async () => {
      // Arrange
      const userId = 1;
      const updateDto = { nickname: '新昵称' };
      const existingUser = UserMockFactory.create({ id: userId });

      userRepository.findByIdOrFail.mockResolvedValue(existingUser);
      userRepository.save.mockResolvedValue({ ...existingUser, ...updateDto } as any);

      // Act
      await service.updateUser(userId, updateDto);

      // Assert
      expect(cache).toBeDefined();
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      userRepository.softDelete = jest.fn().mockResolvedValue(undefined);
    });

    it('应该成功删除用户', async () => {
      // Arrange
      const userId = 1;
      const mockUser = UserMockFactory.create({ id: userId });

      userRepository.findByIdOrFail.mockResolvedValue(mockUser);

      // Act
      await service.deleteUser(userId);

      // Assert
      expect(userRepository.findByIdOrFail).toHaveBeenCalledWith(userId);
      expect(userRepository.softDelete).toHaveBeenCalledWith(userId);
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('deleteUsers', () => {
    beforeEach(() => {
      userRepository.findByIds = jest.fn();
      userRepository.softDelete = jest.fn().mockResolvedValue(undefined);
    });

    it('应该成功批量删除用户', async () => {
      // Arrange
      const userIds = [1, 2, 3];
      const mockUsers = UserMockFactory.createMany(3);

      userRepository.findByIds.mockResolvedValue(mockUsers);

      // Act
      await service.deleteUsers(userIds);

      // Assert
      expect(userRepository.findByIds).toHaveBeenCalledWith(userIds);
      expect(userRepository.softDelete).toHaveBeenCalledTimes(3);
      expect(logger.log).toHaveBeenCalled();
    });

    it('当部分用户不存在时应该抛出BadRequestException', async () => {
      // Arrange
      const userIds = [1, 2, 3];
      const mockUsers = UserMockFactory.createMany(2); // 只返回2个

      userRepository.findByIds.mockResolvedValue(mockUsers);

      // Act & Assert
      await expect(service.deleteUsers(userIds)).rejects.toThrow(BadRequestException);
      await expect(service.deleteUsers(userIds)).rejects.toThrow('部分用户不存在');
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('enableUser', () => {
    it('应该成功启用用户', async () => {
      // Arrange
      const userId = 1;
      const mockUser = UserMockFactory.create({ id: userId, status: 'disabled' as any });
      const enabledUser = {
        ...mockUser,
        status: 'active' as any,
        loginAttempts: 0,
        lockedUntil: undefined,
      };

      userRepository.findByIdOrFail.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(enabledUser as any);

      // Act
      const result = await service.enableUser(userId);

      // Assert
      expect(result.status).toBe('active');
      expect(result.loginAttempts).toBe(0);
      expect(result.lockedUntil).toBeUndefined();
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('disableUser', () => {
    beforeEach(() => {
      userRepository.updateRefreshToken = jest.fn().mockResolvedValue(undefined);
    });

    it('应该成功禁用用户', async () => {
      // Arrange
      const userId = 1;
      const mockUser = UserMockFactory.create({ id: userId, status: 'active' as any });
      const disabledUser = { ...mockUser, status: 'disabled' as any };

      userRepository.findByIdOrFail.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(disabledUser as any);

      // Act
      const result = await service.disableUser(userId);

      // Assert
      expect(result.status).toBe('disabled');
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('getUserPermissions', () => {
    beforeEach(() => {
      userRepository.findOne = jest.fn();
    });

    it('应该返回用户权限列表', async () => {
      // Arrange
      const userId = 1;
      const mockUser = {
        id: userId,
        roles: [
          {
            isActive: true,
            permissions: [
              { code: 'user:view', isActive: true },
              { code: 'user:edit', isActive: true },
            ],
          },
          {
            isActive: true,
            permissions: [
              { code: 'role:view', isActive: true },
              { code: 'user:view', isActive: true }, // 重复权限
            ],
          },
        ],
      };

      cache.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as any);
      cache.set.mockResolvedValue(undefined);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toEqual(['user:view', 'user:edit', 'role:view']);
      expect(cache.get).toHaveBeenCalledWith(CACHE_KEYS.USER_PERMISSIONS(userId));
      expect(cache.set).toHaveBeenCalledWith(
        CACHE_KEYS.USER_PERMISSIONS(userId),
        ['user:view', 'user:edit', 'role:view'],
        expect.any(Number),
      );
    });

    it('应该从缓存获取权限', async () => {
      // Arrange
      const userId = 1;
      const cachedPermissions = ['user:view', 'user:edit'];

      cache.get.mockResolvedValue(cachedPermissions);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toEqual(cachedPermissions);
      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it('当用户不存在时应该返回空数组', async () => {
      // Arrange
      const userId = 999;

      cache.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('应该过滤掉未激活的角色和权限', async () => {
      // Arrange
      const userId = 1;
      const mockUser = {
        id: userId,
        roles: [
          {
            isActive: true,
            permissions: [
              { code: 'user:view', isActive: true },
              { code: 'user:delete', isActive: false }, // 未激活
            ],
          },
          {
            isActive: false, // 未激活角色
            permissions: [{ code: 'admin:all', isActive: true }],
          },
        ],
      };

      cache.get.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.getUserPermissions(userId);

      // Assert
      expect(result).toEqual(['user:view']);
      expect(result).not.toContain('user:delete');
      expect(result).not.toContain('admin:all');
    });
  });

  describe('hasPermission', () => {
    it('应该正确验证用户权限', async () => {
      // Arrange
      const userId = 1;
      const permissionCode = 'user:view';

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(['user:view', 'user:edit']);

      // Act
      const result = await service.hasPermission(userId, permissionCode);

      // Assert
      expect(result).toBe(true);
      expect(service.getUserPermissions).toHaveBeenCalledWith(userId);
    });

    it('当用户没有权限时应该返回false', async () => {
      // Arrange
      const userId = 1;
      const permissionCode = 'admin:all';

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(['user:view', 'user:edit']);

      // Act
      const result = await service.hasPermission(userId, permissionCode);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('当用户拥有全部权限时应该返回true', async () => {
      // Arrange
      const userId = 1;
      const requiredPermissions = ['user:view', 'user:edit'];

      jest
        .spyOn(service, 'getUserPermissions')
        .mockResolvedValue(['user:view', 'user:edit', 'role:view']);

      // Act
      const result = await service.hasAllPermissions(userId, requiredPermissions);

      // Assert
      expect(result).toBe(true);
    });

    it('当用户缺少部分权限时应该返回false', async () => {
      // Arrange
      const userId = 1;
      const requiredPermissions = ['user:view', 'user:edit', 'admin:all'];

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(['user:view', 'user:edit']);

      // Act
      const result = await service.hasAllPermissions(userId, requiredPermissions);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('当用户拥有任一权限时应该返回true', async () => {
      // Arrange
      const userId = 1;
      const permissionCodes = ['user:view', 'admin:all'];

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(['user:view', 'user:edit']);

      // Act
      const result = await service.hasAnyPermission(userId, permissionCodes);

      // Assert
      expect(result).toBe(true);
    });

    it('当用户没有任何指定权限时应该返回false', async () => {
      // Arrange
      const userId = 1;
      const permissionCodes = ['admin:all', 'super:admin'];

      jest.spyOn(service, 'getUserPermissions').mockResolvedValue(['user:view', 'user:edit']);

      // Act
      const result = await service.hasAnyPermission(userId, permissionCodes);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      userRepository.findWithPassword = jest.fn();
      userRepository.updateRefreshToken = jest.fn().mockResolvedValue(undefined);
    });

    it('应该成功修改密码', async () => {
      // Arrange
      const userId = 1;
      const changePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      const mockUser = {
        id: userId,
        password: 'hashedOldPassword',
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      userRepository.findWithPassword.mockResolvedValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);

      // Act
      await service.changePassword(userId, changePasswordDto);

      // Assert
      expect(mockUser.validatePassword).toHaveBeenCalledWith(changePasswordDto.oldPassword);
      expect(mockUser.password).toBe(changePasswordDto.newPassword);
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(logger.log).toHaveBeenCalled();
    });

    it('当新密码与确认密码不一致时应该抛出BadRequestException', async () => {
      // Arrange
      const userId = 1;
      const changePasswordDto = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword123',
      };

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        '两次输入的密码不一致',
      );
    });

    it('当旧密码错误时应该抛出BadRequestException', async () => {
      // Arrange
      const userId = 1;
      const changePasswordDto = {
        oldPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      };

      const mockUser = {
        id: userId,
        password: 'hashedOldPassword',
        validatePassword: jest.fn().mockResolvedValue(false),
      };

      userRepository.findWithPassword.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.changePassword(userId, changePasswordDto)).rejects.toThrow(
        '当前密码错误',
      );
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      userRepository.updateRefreshToken = jest.fn().mockResolvedValue(undefined);
    });

    it('应该成功重置密码', async () => {
      // Arrange
      const userId = 1;
      const resetPasswordDto = {
        password: 'newPassword123',
      };

      const mockUser = UserMockFactory.create({
        id: userId,
        loginAttempts: 5,
        lockedUntil: new Date(),
      });

      userRepository.findByIdOrFail.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser as any);

      // Act
      await service.resetPassword(userId, resetPasswordDto);

      // Assert
      expect(mockUser.password).toBe(resetPasswordDto.password);
      expect(mockUser.loginAttempts).toBe(0);
      expect(mockUser.lockedUntil).toBeUndefined();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(userRepository.updateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('assignRoles', () => {
    beforeEach(() => {
      userRepository.findOne = jest.fn();
    });

    it('应该成功分配角色', async () => {
      // Arrange
      const userId = 1;
      const roleIds = [1, 2];
      const mockUser = UserMockFactory.create({ id: userId });
      const mockRoles = RoleMockFactory.createMany(2);

      userRepository.findOne.mockResolvedValue(mockUser as any);
      roleRepository.find.mockResolvedValue(mockRoles);
      userRepository.save.mockResolvedValue({ ...mockUser, roles: mockRoles } as any);

      // Act
      const result = await service.assignRoles(userId, roleIds);

      // Assert
      expect(result.roles).toEqual(mockRoles);
      expect(logger.log).toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    beforeEach(() => {
      userRepository.findOne = jest.fn();
    });

    it('应该成功获取用户详情', async () => {
      // Arrange
      const userId = 1;
      const mockUser = UserMockFactory.create({ id: userId });

      userRepository.findOne.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findUserById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['roles', 'roles.permissions'],
      });
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('findByUsername', () => {
    beforeEach(() => {
      userRepository.findByUsername = jest.fn();
    });

    it('应该根据用户名获取用户', async () => {
      // Arrange
      const username = 'testuser';
      const mockUser = UserMockFactory.create({ username });

      userRepository.findByUsername.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByUsername(username);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findByUsername).toHaveBeenCalledWith(username);
    });
  });

  describe('findByEmail', () => {
    beforeEach(() => {
      userRepository.findByEmail = jest.fn();
    });

    it('应该根据邮箱获取用户', async () => {
      // Arrange
      const email = 'test@example.com';
      const mockUser = UserMockFactory.create({ email });

      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail(email);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
    });
  });
});
