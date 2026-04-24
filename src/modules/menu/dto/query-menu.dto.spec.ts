import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryMenuDto } from './query-menu.dto';

describe('QueryMenuDto', () => {
  it('parses false query strings as false booleans', async () => {
    const dto = plainToInstance(QueryMenuDto, {
      isActive: 'false',
      isVisible: 'false',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.isActive).toBe(false);
    expect(dto.isVisible).toBe(false);
  });
});
