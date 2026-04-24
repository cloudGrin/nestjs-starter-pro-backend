import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UserController } from './user.controller';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { DeleteUsersDto } from '../dto/delete-users.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';

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

  it('uses DTOs for array request bodies instead of bare number arrays', () => {
    const removeManyParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      UserController.prototype,
      'removeMany',
    );
    const assignRolesParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      UserController.prototype,
      'assignRoles',
    );
    const source = readFileSync(join(__dirname, 'user.controller.ts'), 'utf8');

    expect(removeManyParamTypes[0]).toBe(DeleteUsersDto);
    expect(assignRolesParamTypes[1]).toBe(AssignUserRolesDto);
    expect(source).not.toContain('@Body() ids: number[]');
    expect(source).not.toContain('@Body() roleIds: number[]');
  });
});
