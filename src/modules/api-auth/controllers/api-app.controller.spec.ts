import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ApiAppController } from './api-app.controller';
import { UpdateApiAppDto } from '../dto/update-api-app.dto';

describe('ApiAppController', () => {
  it('uses UpdateApiAppDto for API app updates', () => {
    const paramTypes = Reflect.getMetadata(
      'design:paramtypes',
      ApiAppController.prototype,
      'updateApp',
    );

    expect(paramTypes[1]).toBe(UpdateApiAppDto);
  });

  it('uses ParseIntPipe for numeric route params and does not duplicate JwtAuthGuard at controller level', () => {
    const source = readFileSync(join(__dirname, 'api-app.controller.ts'), 'utf8');

    expect(source).toContain('QueryApiAppsDto');
    expect(source).toContain("@Param('appId', ParseIntPipe)");
    expect(source).toContain("@Param('keyId', ParseIntPipe)");
    expect(source).not.toContain('@UseGuards(JwtAuthGuard)');
  });

  it('uses CurrentUser instead of request wrapper when creating API apps', () => {
    const source = readFileSync(join(__dirname, 'api-app.controller.ts'), 'utf8');

    expect(source).toContain('@CurrentUser() user');
    expect(source).not.toContain('@Req() req');
    expect(source).not.toContain('req.user.id');
    expect(source).not.toContain('AuthenticatedRequest');
  });
});
