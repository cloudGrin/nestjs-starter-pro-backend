import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssignMenusDto } from './assign-menus.dto';

describe('AssignMenusDto', () => {
  it('accepts an empty list to clear role menus', async () => {
    const dto = plainToInstance(AssignMenusDto, { menuIds: [] });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects non-integer menu id lists', async () => {
    const dto = plainToInstance(AssignMenusDto, { menuIds: [1, 'abc'] });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
