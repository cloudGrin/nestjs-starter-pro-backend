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

  it('uses response DTOs for API app and key command responses', () => {
    const source = readFileSync(join(__dirname, 'api-app.controller.ts'), 'utf8');

    expect(source).toContain('ApiAppDeleteResponseDto');
    expect(source).toContain('ApiKeyCreatedResponseDto');
    expect(source).toContain('ApiKeyListItemDto');
    expect(source).toContain('ApiKeyRevokeResponseDto');
    expect(source).not.toContain("return { success: true, message: 'API应用已删除' }");
    expect(source).not.toContain('return {\n      id: key.id');
    expect(source).not.toContain('return keys.map((key) => ({');
    expect(source).not.toContain("message: 'API密钥已撤销'");
  });

  it('passes app list query to service without pagination math in the controller', () => {
    const source = readFileSync(join(__dirname, 'api-app.controller.ts'), 'utf8');

    expect(source).toContain('this.apiAuthService.getApps(query)');
    expect(source).not.toContain('const skip =');
    expect(source).not.toContain('{ skip, take: limit }');
  });

  it('passes owner id as service context instead of building an internal DTO in the controller', () => {
    const source = readFileSync(join(__dirname, 'api-app.controller.ts'), 'utf8');

    expect(source).toContain('this.apiAuthService.createApp(dto, user.id)');
    expect(source).not.toContain('const dtoWithOwner');
    expect(source).not.toContain('ownerId: user.id');
  });
});
