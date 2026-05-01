import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignRoleAccessDto } from './assign-role-access.dto';

describe('AssignRoleAccessDto', () => {
  it('accepts menu and permission id lists for unified role authorization', async () => {
    const dto = plainToInstance(AssignRoleAccessDto, {
      menuIds: [1, 2],
      permissionIds: [3, 4],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts empty lists to clear role menus and permissions', async () => {
    const dto = plainToInstance(AssignRoleAccessDto, {
      menuIds: [],
      permissionIds: [],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-integer ids', async () => {
    const dto = plainToInstance(AssignRoleAccessDto, {
      menuIds: [1, 'bad'],
      permissionIds: [2, 'bad'],
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
