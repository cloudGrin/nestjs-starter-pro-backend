import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  it('rejects page sizes above the supported maximum', async () => {
    const dto = plainToInstance(PaginationDto, { limit: '101' });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
