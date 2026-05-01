import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RoleController } from './role.controller';
import { QueryRoleDto } from '../dto/query-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { AssignRoleAccessDto } from '../dto/assign-role-access.dto';

describe('RoleController', () => {
  it('uses DTOs for query, update, and permission assignment routes', () => {
    const findAllParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RoleController.prototype,
      'findAll',
    );
    const updateParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RoleController.prototype,
      'update',
    );
    const assignPermissionsParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RoleController.prototype,
      'assignPermissions',
    );
    const assignAccessParamTypes = Reflect.getMetadata(
      'design:paramtypes',
      RoleController.prototype,
      'assignAccess',
    );

    expect(findAllParamTypes[0]).toBe(QueryRoleDto);
    expect(updateParamTypes[1]).toBe(UpdateRoleDto);
    expect(assignPermissionsParamTypes[1]).toBe(AssignPermissionsDto);
    expect(assignAccessParamTypes[1]).toBe(AssignRoleAccessDto);
  });

  it('does not use inline runtime-only object types in controller method signatures', () => {
    const source = readFileSync(join(__dirname, 'role.controller.ts'), 'utf8');

    expect(source).toContain('QueryRoleDto');
    expect(source).toContain('UpdateRoleDto');
    expect(source).toContain('AssignPermissionsDto');
    expect(source).toContain('AssignRoleAccessDto');
    expect(source).toContain("@Put(':id/access')");
    expect(source).toContain("@RequirePermissions('role:access:assign')");
    expect(source).not.toContain('query: {');
    expect(source).not.toContain('Partial<CreateRoleDto>');
    expect(source).not.toContain('@Body() permissionIds: number[]');
  });
});
