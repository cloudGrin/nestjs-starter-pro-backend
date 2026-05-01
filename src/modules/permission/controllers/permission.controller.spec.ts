import 'reflect-metadata';
import { PERMISSIONS_KEY } from '~/core/decorators';
import { PermissionController } from './permission.controller';

describe('PermissionController', () => {
  it('allows role authorization permissions to read the permission tree needed by the role access modal', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      PermissionController.prototype.getTree,
    );

    expect(permissions).toEqual(
      expect.arrayContaining(['permission:read', 'role:access:assign', 'role:permission:assign']),
    );
  });
});
