import { ValidationPipe } from '@nestjs/common';
import { UpdateApiAppDto } from './update-api-app.dto';

describe('UpdateApiAppDto', () => {
  it('strips ownerId from API app updates', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    });

    const result = await pipe.transform(
      {
        name: 'Mini Program',
        scopes: ['read:users'],
        ownerId: 999,
      },
      {
        type: 'body',
        metatype: UpdateApiAppDto,
      },
    );

    expect(result).toEqual({
      name: 'Mini Program',
      scopes: ['read:users'],
    });
  });
});
