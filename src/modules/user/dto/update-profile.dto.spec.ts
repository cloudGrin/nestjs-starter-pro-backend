import { ValidationPipe } from '@nestjs/common';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('strips admin-only fields from profile updates', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    });

    const result = await pipe.transform(
      {
        nickname: 'personal-user',
        realName: 'Personal User',
        status: 'disabled',
        roleIds: [1, 2],
      },
      {
        type: 'body',
        metatype: UpdateProfileDto,
      },
    );

    expect(result).toEqual({
      nickname: 'personal-user',
      realName: 'Personal User',
    });
  });
});
