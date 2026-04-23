import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OpenUserListQueryDto } from './open-user-list-query.dto';

describe('OpenUserListQueryDto', () => {
  it('transforms numeric query strings into numbers', async () => {
    const dto = plainToInstance(OpenUserListQueryDto, {
      page: '2',
      pageSize: '20',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(20);
  });

  it('rejects values outside the allowed range', async () => {
    const dto = plainToInstance(OpenUserListQueryDto, {
      page: '0',
      pageSize: '500',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'page')).toBe(true);
    expect(errors.some((error) => error.property === 'pageSize')).toBe(true);
  });
});
