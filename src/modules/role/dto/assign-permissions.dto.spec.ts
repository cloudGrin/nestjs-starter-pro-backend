import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignPermissionsDto } from './assign-permissions.dto';

describe('AssignPermissionsDto', () => {
  it('accepts an empty list to clear role permissions', async () => {
    const dto = plainToInstance(AssignPermissionsDto, { permissionIds: [] });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-integer permission id lists', async () => {
    const dto = plainToInstance(AssignPermissionsDto, { permissionIds: [1, 'abc'] });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
