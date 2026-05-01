import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApiAppDto } from './create-api-app.dto';

describe('CreateApiAppDto', () => {
  it('rejects names longer than the database column length', async () => {
    const dto = plainToInstance(CreateApiAppDto, {
      name: 'a'.repeat(101),
      scopes: ['read:users'],
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
