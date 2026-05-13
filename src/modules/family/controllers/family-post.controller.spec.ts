import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '~/core/decorators/public.decorator';
import { FamilyPostController } from './family-post.controller';

describe('FamilyPostController', () => {
  it('exposes a public family post preview without making the authenticated feed public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, FamilyPostController.prototype.findPublicPreviewPosts),
    ).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, FamilyPostController.prototype.findPosts)).toBe(
      undefined,
    );
  });
});
