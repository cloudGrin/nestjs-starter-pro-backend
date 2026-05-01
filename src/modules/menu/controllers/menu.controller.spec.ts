import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PERMISSIONS_KEY } from '~/core/decorators';
import { MenuController } from './menu.controller';

describe('MenuController', () => {
  it('uses CurrentUser instead of reading req.user directly for current-user menu routes', () => {
    const source = readFileSync(join(__dirname, 'menu.controller.ts'), 'utf8');

    expect(source).toContain('@CurrentUser() user');
    expect(source).not.toContain('@Req() req');
    expect(source).not.toContain('const user = req.user as any');
  });

  it('uses a DTO for validate-path query instead of manual parseInt handling', () => {
    const source = readFileSync(join(__dirname, 'menu.controller.ts'), 'utf8');

    expect(source).toContain('ValidateMenuPathDto');
    expect(source).not.toContain("@Query('path') path: string");
    expect(source).not.toContain("@Query('excludeId') excludeIdStr?: string");
    expect(source).not.toContain('parseInt(excludeIdStr, 10)');
  });

  it('allows role authorization permissions to read the menu tree needed by the role access modal', () => {
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, MenuController.prototype.getTree);

    expect(permissions).toEqual(
      expect.arrayContaining(['menu:read', 'role:access:assign', 'role:menu:assign']),
    );
  });
});
