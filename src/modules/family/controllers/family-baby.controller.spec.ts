import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '~/core/decorators/public.decorator';
import { PERMISSIONS_KEY } from '~/core/decorators/require-permissions.decorator';
import { FamilyBabyController } from './family-baby.controller';

describe('FamilyBabyController', () => {
  it('keeps baby avatar upload under baby profile permissions', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      FamilyBabyController.prototype.uploadAvatarImage,
    );

    expect(permissions).toEqual(['baby:update']);
  });

  it('exposes only the baby overview preview publicly', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, FamilyBabyController.prototype.findPublicPreview),
    ).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, FamilyBabyController.prototype.findOverview)).toBe(
      undefined,
    );
  });
});
