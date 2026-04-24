import { readFileSync } from 'fs';
import { join } from 'path';

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
});
