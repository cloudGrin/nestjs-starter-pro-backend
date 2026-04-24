import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UserController } from './user.controller';
import { UpdateProfileDto } from '../dto/update-profile.dto';

describe('UserController', () => {
  it('uses UpdateProfileDto for the profile update route', () => {
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      UserController.prototype,
      'updateProfile',
    );

    expect(paramTypes[1]).toBe(UpdateProfileDto);
  });

  it('uses CurrentUser instead of reading req.user directly for self-service routes', () => {
    const source = readFileSync(join(__dirname, 'user.controller.ts'), 'utf8');

    expect(source).toContain('@CurrentUser() user');
    expect(source).not.toContain('const userId = (req as any).user?.id');
    expect(source).not.toContain('@Req() req');
  });
});
