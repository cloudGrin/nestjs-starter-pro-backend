import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '~/modules/user/services/user.service';

describe('JwtStrategy', () => {
  it('maps deleted users to UnauthorizedException instead of NotFoundException', async () => {
    const userService = {
      findUserById: jest.fn().mockRejectedValue(new NotFoundException('用户不存在')),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    const strategy = new JwtStrategy(userService, configService);

    await expect(
      strategy.validate({
        sub: 1,
        username: 'ghost',
        email: 'ghost@example.com',
        type: 'access',
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
        roles: [{ code: 'super_admin' }],
      }),
      getUserPermissions: jest.fn(),
    } as unknown as jest.Mocked<UserService>;
    const configService = {
      get: jest.fn().mockReturnValue('jwt-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    const strategy = new JwtStrategy(userService, configService);

    const result = await strategy.validate({
      sub: 1,
      username: 'admin',
      email: 'admin@example.com',
      type: 'access',
      sessionId: 'sid',
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
});
