import { ValidationPipe } from '@nestjs/common';
import { QueryFileDto } from './query-file.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});

const transformQuery = (value: Record<string, unknown>) =>
  pipe.transform(value, {
    type: 'query',
    metatype: QueryFileDto,
  }) as Promise<QueryFileDto>;

describe('QueryFileDto', () => {
  it('transforms public filter false string into false instead of truthy boolean', async () => {
    const dto = await transformQuery({ isPublic: 'false' });

    expect(dto.isPublic).toBe(false);
  });
});
