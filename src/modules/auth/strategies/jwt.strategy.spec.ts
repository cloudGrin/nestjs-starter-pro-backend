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
});
