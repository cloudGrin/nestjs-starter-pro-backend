import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiKeyEnvironment, CreateApiKeyDto } from './create-api-key.dto';

describe('CreateApiKeyDto', () => {
  it('rejects names longer than the database column length', async () => {
    const dto = plainToInstance(CreateApiKeyDto, {
      name: 'a'.repeat(101),
      environment: ApiKeyEnvironment.TEST,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('rejects past expiration dates', async () => {
    const dto = plainToInstance(CreateApiKeyDto, {
      name: 'Test Key',
      environment: ApiKeyEnvironment.TEST,
      expiresAt: '2020-01-01T00:00:00.000Z',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
