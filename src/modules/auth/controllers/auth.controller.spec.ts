import { PATH_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('does not expose a register route', () => {
    const routeMethods = Object.getOwnPropertyNames(AuthController.prototype).filter(
      (name) => name !== 'constructor',
    );

    const paths = routeMethods
      .map((name) => Reflect.getMetadata(PATH_METADATA, AuthController.prototype[name]))
      .filter(Boolean);

    expect(paths).not.toContain('register');
  });
});
