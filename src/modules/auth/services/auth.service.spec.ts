import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UserService } from '~/modules/user/services/user.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { UserStatus } from '~/common/enums/user.enum';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcryptjs';

const createUserLoginQueryBuilder = () => {
  const qb = {
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  return qb;
};

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let userRepository: any;
  let refreshTokenRepository: any;
  let jwtService: jest.Mocked<JwtService>;
  let logger: jest.Mocked<LoggerService>;
  let cacheService: jest.Mocked<CacheService>;

  const createMockUser = (overrides?: Partial<UserEntity>): UserEntity => {
    const user = new UserEntity();
    user.id = faker.number.int({ min: 1, max: 1000 });
    user.username = faker.internet.userName();
    user.email = faker.internet.email();
    user.password = bcrypt.hashSync('Password123!', 10);
    user.realName = faker.person.fullName();
    user.status = UserStatus.ACTIVE;
    user.lockedUntil = undefined;
    user.loginAttempts = 0;
    user.roles = [];
    user.createdAt = new Date();
    user.updatedAt = new Date();
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
    token.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    token.isRevoked = false;
    token.ipAddress = '192.168.1.1';
    token.userAgent = 'Mozilla/5.0';
    token.createdAt = new Date();
    token.isValid = jest.fn().mockReturnValue(true);
    return Object.assign(token, overrides);
  };

  beforeEach(async () => {
    const mockUserService = {
      createUser: jest.fn(),
      getUserPermissions: jest.fn(),
    };

    const mockUserRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockRefreshTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
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
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    refreshTokenRepository = module.get(getRepositoryToken(RefreshTokenEntity));
    jwtService = module.get(JwtService);
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
      const mockUser = createMockUser({ username: 'testuser', status: UserStatus.ACTIVE });
      const qb = createUserLoginQueryBuilder();
      qb.getOne.mockResolvedValue(mockUser);
      const refreshTokenEntity = createMockRefreshToken();

      userRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.update.mockResolvedValue(undefined);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      refreshTokenRepository.create.mockReturnValue(refreshTokenEntity);
      refreshTokenRepository.save.mockResolvedValue(refreshTokenEntity);

      const result = await service.login(mockLoginDto, mockIp, mockUserAgent);

      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-refresh-token');
      expect(mockUser.validatePassword).toHaveBeenCalledWith(mockLoginDto.password);
      expect(userRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ lastLoginIp: mockIp }),
      );
    });

    it('当用户不存在时应该抛出UnauthorizedException', async () => {
      const qb = createUserLoginQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      userRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('当密码错误时应该抛出UnauthorizedException并记录失败', async () => {
      const mockUser = createMockUser();
      (mockUser.validatePassword as jest.Mock).mockResolvedValue(false);
      const qb = createUserLoginQueryBuilder();
      qb.getOne.mockResolvedValue(mockUser);
      userRepository.createQueryBuilder.mockReturnValue(qb);
      userRepository.save.mockResolvedValue(mockUser);

      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUser.incrementLoginAttempts).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(cacheService.incr).toHaveBeenCalled();
    });

    it('当账户被禁用时应该抛出UnauthorizedException', async () => {
      const mockUser = createMockUser({ status: UserStatus.DISABLED });
      const qb = createUserLoginQueryBuilder();
      qb.getOne.mockResolvedValue(mockUser);
      userRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.login(mockLoginDto, mockIp, mockUserAgent)).rejects.toThrow(
        '账户已被禁用',
      );
    });
  });

  describe('refreshToken', () => {
    const mockRefreshTokenString = 'mock-refresh-token';
    const mockRefreshTokenDto: RefreshTokenDto = {
      refreshToken: mockRefreshTokenString,
    };

    it('应该成功刷新令牌并返回新的访问令牌', async () => {
      const mockUser = createMockUser({ status: UserStatus.ACTIVE });
      const mockRefreshToken = createMockRefreshToken({
        userId: mockUser.id,
        token: mockRefreshTokenString,
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        user: mockUser,
      });

      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        username: mockUser.username,
        type: 'refresh',
        sessionId: mockRefreshToken.deviceId,
      } as any);
      refreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      jwtService.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refreshToken(mockRefreshTokenDto);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe(mockRefreshTokenString);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: mockRefreshTokenString },
        relations: ['user', 'user.roles', 'user.roles.permissions'],
      });
    });

    it('当刷新令牌即将过期时应该旋转令牌', async () => {
      const mockUser = createMockUser({ status: UserStatus.ACTIVE });
      const storedToken = createMockRefreshToken({
        userId: mockUser.id,
        token: mockRefreshTokenString,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        user: mockUser,
      });
      const newRefreshEntity = createMockRefreshToken();

      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        username: mockUser.username,
        type: 'refresh',
        sessionId: storedToken.deviceId,
      } as any);
      refreshTokenRepository.findOne.mockResolvedValue(storedToken);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      refreshTokenRepository.save.mockResolvedValue(storedToken);
      refreshTokenRepository.create.mockReturnValue(newRefreshEntity);

      const result = await service.refreshToken(mockRefreshTokenDto);

      expect(result.refreshToken).toBe('new-refresh-token');
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: true }),
      );
    });

    it('当刷新令牌无效时应该抛出UnauthorizedException', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(mockRefreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('应该成功登出单个会话', async () => {
      refreshTokenRepository.update.mockResolvedValue(undefined);

      await service.logout(1, 'session-id', 'refresh-token');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { token: 'refresh-token' },
        { isRevoked: true },
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:permissions:1');
    });

    it('应该成功登出所有会话', async () => {
      refreshTokenRepository.update.mockResolvedValue(undefined);

      await service.logout(1);

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 1, isRevoked: false },
        { isRevoked: true },
      );
      expect(cacheService.del).toHaveBeenCalledWith('user:permissions:1');
    });

    it('撤销刷新令牌失败时应该向调用方抛出异常', async () => {
      refreshTokenRepository.update.mockRejectedValue(new Error('database unavailable'));

      await expect(service.logout(1, undefined, 'refresh-token')).rejects.toThrow(
        'database unavailable',
      );
    });
  });
});
