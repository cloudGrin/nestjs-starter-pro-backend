import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryPermissionDto } from './query-permission.dto';

describe('QueryPermissionDto', () => {
  it('parses false query strings as false booleans', async () => {
    const dto = plainToInstance(QueryPermissionDto, {
      isActive: 'false',
      isSystem: 'false',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.isActive).toBe(false);
    expect(dto.isSystem).toBe(false);
  });
});
