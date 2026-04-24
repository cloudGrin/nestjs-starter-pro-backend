import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeleteUsersDto } from './delete-users.dto';

describe('DeleteUsersDto', () => {
  it('accepts a non-empty integer id list', async () => {
    const dto = plainToInstance(DeleteUsersDto, { ids: ['1', 2] });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.ids).toEqual([1, 2]);
  });

  it('rejects empty or non-integer id lists', async () => {
    await expect(validate(plainToInstance(DeleteUsersDto, { ids: [] }))).resolves.not.toHaveLength(
      0,
    );
    await expect(
      validate(plainToInstance(DeleteUsersDto, { ids: [1, 'abc'] })),
    ).resolves.not.toHaveLength(0);
  });
});
