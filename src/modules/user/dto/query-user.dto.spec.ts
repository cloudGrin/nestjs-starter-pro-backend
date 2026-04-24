import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryUserDto } from './query-user.dto';

describe('QueryUserDto', () => {
  it('transforms and validates roleId as a positive integer', async () => {
    const dto = plainToInstance(QueryUserDto, { roleId: '2' });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.roleId).toBe(2);
  });

  it('rejects invalid roleId values', async () => {
    await expect(
      validate(plainToInstance(QueryUserDto, { roleId: 'abc' })),
    ).resolves.not.toHaveLength(0);
    await expect(
      validate(plainToInstance(QueryUserDto, { roleId: '0' })),
    ).resolves.not.toHaveLength(0);
  });
});
