import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UserService } from '~/modules/user/services/user.service';
import { UserRepository } from '~/modules/user/repositories/user.repository';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { UserStatus } from '~/common/enums/user.enum';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let userRepository: jest.Mocked<UserRepository>;
  let refreshTokenRepository: any;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<LoggerService>;
  let cacheService: jest.Mocked<CacheService>;

  // Mock 数据工厂
  const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => {
    const user = new UserEntity();
    user.id = faker.number.int({ min: 1, max: 1000 });
    user.username = faker.internet.userName();
    user.email = faker.internet.email();
    user.password = bcrypt.hashSync('Password123!', 10);
    user.realName = faker.person.fullName();
    user.phone = faker.phone.number();
    user.avatar = faker.image.url();
    user.status = UserStatus.ACTIVE;
    user.lockStatus = 'unlocked';
    user.lockedUntil = undefined;
    user.loginAttempts = 0;
    user.roles = [];
    user.createdAt = new Date();
    user.updatedAt = new Date();

    // Mock 方法
    user.isLocked = jest.fn().mockReturnValue(false);
    user.validatePassword = jest.fn().mockResolvedValue(true);
    user.incrementLoginAttempts = jest.fn();
    user.resetLoginAttempts = jest.fn();

    return Object.assign(user, overrides);
  };

  const createMockRefreshToken = (overrides?: Partial<RefreshTokenEntity>): RefreshTokenEntity => {
    const token = new RefreshTokenEntity();
    token.id = faker.number.int({ min: 1, max: 1000 });
    token.userId = faker.number.int({ min: 1, max: 1000 });
    token.token = faker.string.uuid();
    token.deviceId = faker.string.uuid();
    token.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天后
    token.isRevoked = false;
    token.ipAddress = '192.168.1.1';
    token.userAgent = 'Mozilla/5.0';
    token.createdAt = new Date();

    // Mock 方法
    token.isValid = jest.fn().mockReturnValue(true);

    return Object.assign(token, overrides);
  };

  beforeEach(async () => {
    // 创建 mock 对象
    const mockUserService = {
      createUser: jest.fn(),
      getUserPermissions: jest.fn(),
    };

    const mockUserRepository = {
      findForLogin: jest.fn(),
      isUsernameExist: jest.fn(),
      isEmailExist: jest.fn(),
      updateLoginInfo: jest.fn(),
      save: jest.fn(),
    };

    const mockRefreshTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]), // 默认返回空数组
      delete: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '30d',
        };
        return config[key];
      }),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: UserRepository, useValue: mockUserRepository },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    userRepository = module.get(UserRepository);
    refreshTokenRepository = module.get(getRepositoryToken(RefreshTokenEntity));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    logger = module.get(LoggerService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockLoginDto: LoginDto = {
      account: 'testuser',
      password: 'Password123!',
    };
    const mockIp = '192.168.1.100';
    const mockUserAgent = 'Mozilla/5.0';

    it('应该成功登录并返回用户信息和令牌', async () => {
      // Arrange
      const mockUser = createMockUser({
        username: 'testuser',
        status: UserStatus.ACTIVE,
      });
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      (mockUser.validatePassword as jest.Mock).mockResolvedValue(true);
      (mockUser.isLocked as jest.Mock).mockReturnValue(false);

      userRepository.findForLogin.mockResolvedValue(mockUser);
      userRepository.updateLoginInfo.mockResolvedValue(undefined);
      jwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);
      refreshTokenRepository.create.mockReturnValue(createMockRefreshToken());
      refreshTokenRepository.save.mockResolvedValue(createMockRefreshToken());

      // Act
      const result = await service.login(mockLoginDto, mockIp, mockUserAgent);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken', mockAccessToken);
      expect(result.tokens).toHaveProperty('refreshToken', mockRefreshToken);

      // 验证调用
      expect(userRepository.findForLogin).toHaveBeenCalledWith(mockLoginDto.account);
      expect(mockUser.validatePassword).toHaveBeenCalledWith(mockLoginDto.password);
      expect(mockUser.resetLoginAttempts).toHaveBeenCalled();
      expect(userRepository.updateLoginInfo).toHaveBeenCalledWith(mockUser.id, mockIp);
    });

    it('当用户不存在时应该抛出UnauthorizedException', async () => {
      // Arrange
      userRepository.findForLogin.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        '用户名或密码错误',
      );
    });

    it('当密码错误时应该抛出UnauthorizedException并增加失败计数', async () => {
      // Arrange
      const mockUser = createMockUser({
        username: 'testuser',
        status: UserStatus.ACTIVE,
      });
      (mockUser.validatePassword as jest.Mock).mockResolvedValue(false);
      (mockUser.isLocked as jest.Mock).mockReturnValue(false);

      userRepository.findForLogin.mockResolvedValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        '用户名或密码错误',
      );

      expect(mockUser.incrementLoginAttempts).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(cacheService.incr).toHaveBeenCalled();
    });

    it('当用户被锁定时应该抛出UnauthorizedException', async () => {
      // Arrange
      const mockUser = createMockUser({
        username: 'testuser',
        lockStatus: 'temporary',
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });
      (mockUser.isLocked as jest.Mock).mockReturnValue(true);

      userRepository.findForLogin.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        /账户已被锁定/,
      );
    });

    it('当用户状态为disabled时应该抛出UnauthorizedException', async () => {
      // Arrange
      const mockUser = createMockUser({
        username: 'testuser',
        status: UserStatus.DISABLED,
      });
      (mockUser.isLocked as jest.Mock).mockReturnValue(false);

      userRepository.findForLogin.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        '账户已被禁用',
      );
    });

    it('当用户状态为inactive时应该抛出UnauthorizedException', async () => {
      // Arrange
      const mockUser = createMockUser({
        username: 'testuser',
        status: UserStatus.INACTIVE,
      });
      (mockUser.isLocked as jest.Mock).mockReturnValue(false);

      userRepository.findForLogin.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        '账户未激活',
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshTokenString = 'mock-refresh-token';
    const mockRefreshTokenDto: RefreshTokenDto = {
      refreshToken: mockRefreshTokenString,
    };

    it('应该成功刷新令牌并返回新的访问令牌', async () => {
      // Arrange
      const mockUser = createMockUser({ status: UserStatus.ACTIVE });
      const mockRefreshToken = createMockRefreshToken({
        userId: mockUser.id,
        token: mockRefreshTokenString,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20天后过期
        user: mockUser,
      });
      const mockNewAccessToken = 'new-access-token';
      const mockPayload = {
        sub: mockUser.id,
        username: mockUser.username,
        type: 'refresh',
        sessionId: mockRefreshToken.deviceId,
      };

      (mockRefreshToken.isValid as jest.Mock).mockReturnValue(true);

      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync.mockResolvedValue(mockNewAccessToken);

      // Act
      const result = await service.refreshToken(mockRefreshTokenDto);

      // Assert
      expect(result).toHaveProperty('accessToken', mockNewAccessToken);
      expect(result).toHaveProperty('refreshToken', mockRefreshTokenString); // 未旋转
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('sessionId');

      expect(jwtService.verifyAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: mockRefreshTokenString },
        relations: ['user', 'user.roles', 'user.roles.permissions'],
      });
    });

    it('当刷新令牌即将过期时应该旋转令牌（<7天）', async () => {
      // Arrange
      const mockUser = createMockUser({ status: UserStatus.ACTIVE });
      const mockRefreshToken = createMockRefreshToken({
        userId: mockUser.id,
        token: mockRefreshTokenString,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后过期
        user: mockUser,
      });
      const mockNewAccessToken = 'new-access-token';
      const mockNewRefreshToken = 'new-refresh-token';
      const mockPayload = {
        sub: mockUser.id,
        username: mockUser.username,
        type: 'refresh',
        sessionId: mockRefreshToken.deviceId,
      };

      (mockRefreshToken.isValid as jest.Mock).mockReturnValue(true);

      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync
        .mockResolvedValueOnce(mockNewAccessToken)
        .mockResolvedValueOnce(mockNewRefreshToken);
      refreshTokenRepository.save.mockResolvedValue(mockRefreshToken);
      refreshTokenRepository.create.mockReturnValue(createMockRefreshToken());

      // Act
      const result = await service.refreshToken(mockRefreshTokenDto);

      // Assert
      expect(result).toHaveProperty('accessToken', mockNewAccessToken);
      expect(result).toHaveProperty('refreshToken', mockNewRefreshToken); // 已旋转

      // 验证旧令牌被撤销
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: true }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Refresh token rotated for user'),
      );
    });

    it('当刷新令牌无效时应该抛出UnauthorizedException', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(service.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(mockRefreshTokenDto)).rejects.toThrow('无效的刷新令牌');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh token'),
        expect.anything(),
      );
    });
  });

  describe('logout', () => {
    const mockUserId = 1;
    const mockSessionId = 'test-session-id';
    const mockRefreshTokenString = 'mock-refresh-token';

    it('应该成功登出单个会话', async () => {
      // Arrange
      const mockRefreshToken = createMockRefreshToken({
        userId: mockUserId,
        deviceId: mockSessionId,
        token: mockRefreshTokenString,
      });

      refreshTokenRepository.update.mockResolvedValue(undefined);

      // Act
      await service.logout(mockUserId, mockSessionId, mockRefreshTokenString);

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { token: mockRefreshTokenString },
        { isRevoked: true },
      );
      expect(cacheService.del).toHaveBeenCalledWith(`user:permissions:${mockUserId}`);
    });

    it('应该成功登出所有会话', async () => {
      // Arrange
      refreshTokenRepository.update.mockResolvedValue(undefined);

      // Act
      await service.logout(mockUserId); // 不传 sessionId 和 refreshToken

      // Assert
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isRevoked: false },
        { isRevoked: true },
      );
      expect(cacheService.del).toHaveBeenCalledWith(`user:permissions:${mockUserId}`);
    });
  });
});
