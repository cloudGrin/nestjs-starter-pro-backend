import { readFileSync } from 'fs';
import { join } from 'path';

describe('MenuController', () => {
  it('uses CurrentUser instead of reading req.user directly for current-user menu routes', () => {
    const source = readFileSync(join(__dirname, 'menu.controller.ts'), 'utf8');

    expect(source).toContain('@CurrentUser() user');
    expect(source).not.toContain('@Req() req');
    expect(source).not.toContain('const user = req.user as any');
  });
});
