import 'reflect-metadata';
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
});
