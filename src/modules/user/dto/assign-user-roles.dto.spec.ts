import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignUserRolesDto } from './assign-user-roles.dto';

describe('AssignUserRolesDto', () => {
  it('accepts a non-empty integer role id list', async () => {
    const dto = plainToInstance(AssignUserRolesDto, { roleIds: ['1', 2] });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.roleIds).toEqual([1, 2]);
  });

  it('rejects empty or non-integer role id lists', async () => {
    await expect(
      validate(plainToInstance(AssignUserRolesDto, { roleIds: [] })),
    ).resolves.not.toHaveLength(0);
    await expect(
      validate(plainToInstance(AssignUserRolesDto, { roleIds: [1, 'abc'] })),
    ).resolves.not.toHaveLength(0);
  });
});
