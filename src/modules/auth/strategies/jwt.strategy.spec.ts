import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '~/modules/user/services/user.service';

describe('JwtStrategy', () => {
  const createRefreshTokenRepository = () =>
    ({
      count: jest.fn().mockResolvedValue(1),
    }) as unknown as jest.Mocked<Pick<any, 'count'>>;

  it('maps deleted users to UnauthorizedException instead of NotFoundException', async () => {
    const userService = {
      findUserById: jest.fn().mockRejectedValue(new NotFoundException('用户不存在')),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;
    const refreshTokenRepository = createRefreshTokenRepository();

    const strategy = new JwtStrategy(userService, configService, refreshTokenRepository as any);

    await expect(
      strategy.validate({
        sub: 1,
        username: 'ghost',
        email: 'ghost@example.com',
        type: 'access',
        sessionId: 'sid',
        tokenVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not load permissions during authentication because PermissionsGuard owns authorization', async () => {
    const userService = {
      findUserById: jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        status: 'active',
        tokenVersion: 0,
        roles: [{ code: 'super_admin' }],
      }),
      getUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;
    const refreshTokenRepository = createRefreshTokenRepository();

    const strategy = new JwtStrategy(userService, configService, refreshTokenRepository as any);

    const result = await strategy.validate({
      sub: 1,
      username: 'admin',
      email: 'admin@example.com',
      type: 'access',
      sessionId: 'sid',
      tokenVersion: 0,
    });

    expect(userService.getUserPermissions).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        roles: ['super_admin'],
        isSuperAdmin: true,
        roleCode: 'super_admin',
        sessionId: 'sid',
      }),
    );
    expect(result).not.toHaveProperty('permissions');
  });

  it('rejects access tokens when their token version is stale', async () => {
    const userService = {
      findUserById: jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        status: 'active',
        tokenVersion: 2,
        roles: [{ code: 'admin' }],
      }),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;
    const refreshTokenRepository = createRefreshTokenRepository();

    const strategy = new JwtStrategy(userService, configService, refreshTokenRepository as any);

    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        email: 'admin@example.com',
        type: 'access',
        sessionId: 'sid',
        tokenVersion: 1,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects access tokens whose session no longer has an active refresh token', async () => {
    const userService = {
      findUserById: jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        status: 'active',
        tokenVersion: 0,
        roles: [{ code: 'admin' }],
      }),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;
    const refreshTokenRepository = createRefreshTokenRepository();
    refreshTokenRepository.count.mockResolvedValue(0);

    const strategy = new JwtStrategy(userService, configService, refreshTokenRepository as any);

    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        email: 'admin@example.com',
        type: 'access',
        sessionId: 'sid',
        tokenVersion: 0,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshTokenRepository.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: 1,
        deviceId: 'sid',
        isRevoked: false,
      }),
    });
  });
});
