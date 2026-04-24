import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = join(__dirname, '..');
const sourceRoot = __dirname;

const readSource = (path: string) => readFileSync(join(sourceRoot, path), 'utf8');
const existsInSource = (path: string) => existsSync(join(sourceRoot, path));
const readProject = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('architecture slimming', () => {
  it('does not load generic scaffold modules without current business usage', () => {
    const appModule = readSource('app.module.ts');

    expect(appModule).not.toContain('DictModule');
    expect(appModule).not.toContain('SystemConfigModule');
    expect(existsInSource('modules/dict')).toBe(false);
    expect(existsInSource('modules/config')).toBe(false);
  });

  it('keeps task scheduling as code cron only, not a database task platform', () => {
    const appModule = readSource('app.module.ts');
    const migration = readSource('migrations/1730000000000-InitSchema.ts');

    expect(appModule).toContain('CronModule');
    expect(appModule).not.toContain('TaskModule');
    expect(existsInSource('modules/task')).toBe(false);
    expect(migration).not.toContain('task_definitions');
    expect(migration).not.toContain('task_logs');
  });

  it('keeps file module to direct upload/download/list/delete only', () => {
    const controller = readSource('modules/file/controllers/file.controller.ts');
    const service = readSource('modules/file/services/file.service.ts');
    const configuration = readSource('config/configuration.ts');

    expect(controller).not.toContain("upload/chunk");
    expect(controller).not.toContain("signed-url");
    expect(service).not.toContain('uploadChunk');
    expect(service).not.toContain('generateDownloadUrl');
    expect(service).not.toContain('processImageIfNeeded');
    expect(configuration).not.toContain('thumbnail');
  });

  it('keeps api auth to apps, keys, scopes and active status only', () => {
    const appEntity = readSource('modules/api-auth/entities/api-app.entity.ts');
    const dto = readSource('modules/api-auth/dto/create-api-app.dto.ts');
    const service = readSource('modules/api-auth/services/api-auth.service.ts');
    const strategy = readSource('modules/api-auth/strategies/simple-api-key.strategy.ts');
    const module = readSource('modules/api-auth/api-auth.module.ts');
    const packageJson = readProject('package.json');

    for (const token of ['callbackUrl', 'webhookUrl', 'ipWhitelist', 'rateLimitPerHour', 'rateLimitPerDay']) {
      expect(appEntity).not.toContain(token);
      expect(dto).not.toContain(token);
    }

    expect(service).not.toContain('ApiCallLog');
    expect(service).not.toContain('checkRateLimit');
    expect(service).not.toContain('getApiStatistics');
    expect(strategy).not.toContain('ipaddr');
    expect(strategy).not.toContain('checkRateLimit');
    expect(module).not.toContain('ApiCallLog');
    expect(packageJson).not.toContain('"ipaddr.js"');
  });

  it('removes unused api statistics endpoints and RBAC placeholder endpoints', () => {
    const openApiController = readSource('modules/open-api/controllers/open-api.controller.ts');
    const apiAppController = readSource('modules/api-auth/controllers/api-app.controller.ts');
    const roleController = readSource('modules/role/controllers/role.controller.ts');
    const roleService = readSource('modules/role/services/role.service.ts');

    expect(openApiController).not.toContain("statistics");
    expect(apiAppController).not.toContain("statistics");
    expect(roleController).not.toContain('effective-permissions');
    expect(roleController).not.toContain('check-exclusive');
    expect(roleService).not.toContain('getEffectivePermissions');
    expect(roleService).not.toContain('checkExclusiveConflict');
  });

  it('does not provide CacheClearService as a parallel cache invalidation abstraction', () => {
    const cacheModule = readSource('shared/cache/cache.module.ts');

    expect(cacheModule).not.toContain('CacheClearService');
    expect(existsInSource('shared/cache/cache-clear.service.ts')).toBe(false);
  });

  it('keeps menu authorization to role-menu mapping only, without display conditions or lock-heavy moves', () => {
    const menuEntity = readSource('modules/menu/entities/menu.entity.ts');
    const createMenuDto = readSource('modules/menu/dto/create-menu.dto.ts');
    const menuService = readSource('modules/menu/services/menu.service.ts');
    const migration = readSource('migrations/1730000000000-InitSchema.ts');

    expect(menuEntity).not.toContain('displayCondition');
    expect(createMenuDto).not.toContain('displayCondition');
    expect(menuService).not.toContain('async getUserMenus(');
    expect(menuService).not.toContain('pessimistic_write');
    expect(menuService).not.toContain('pessimistic_read');
    expect(migration).not.toContain('displayCondition json');
  });

  it('removes parallel role-guard auth, stale register flow, and unused CRUD scaffold', () => {
    const authModule = readSource('modules/auth/auth.module.ts');
    const roleController = readSource('modules/role/controllers/role.controller.ts');
    const authService = readSource('modules/auth/services/auth.service.ts');
    const authController = readSource('modules/auth/controllers/auth.controller.ts');
    const mockFactory = readSource('test-utils/mock-factory.ts');

    expect(authModule).not.toContain('RolesGuard');
    expect(roleController).not.toContain('AdminOnly');
    expect(authService).not.toContain('async register(');
    expect(authController).not.toContain("@Post('register')");
    expect(mockFactory).not.toContain('RegisterDtoMockFactory');
    expect(existsInSource('modules/auth/guards/roles.guard.ts')).toBe(false);
    expect(existsInSource('modules/auth/decorators/roles.decorator.ts')).toBe(false);
    expect(existsInSource('modules/auth/dto/register.dto.ts')).toBe(false);
    expect(existsInSource('core/base/crud.controller.ts')).toBe(false);
  });

  it('uses DTO validation for open api user query instead of runtime-only interfaces', () => {
    const openApiController = readSource('modules/open-api/controllers/open-api.controller.ts');
    const dto = readSource('modules/open-api/dto/open-user-list-query.dto.ts');

    expect(openApiController).not.toContain('interface UserListQuery');
    expect(openApiController).toContain('OpenUserListQueryDto');
    expect(dto).toContain('class OpenUserListQueryDto');
  });

  it('uses native swagger response decorators instead of a custom response wrapper layer', () => {
    const decoratorIndex = readSource('core/decorators/index.ts');
    const authController = readSource('modules/auth/controllers/auth.controller.ts');
    const userController = readSource('modules/user/controllers/user.controller.ts');
    const roleController = readSource('modules/role/controllers/role.controller.ts');
    const permissionController = readSource('modules/permission/controllers/permission.controller.ts');
    const menuController = readSource('modules/menu/controllers/menu.controller.ts');
    const fileController = readSource('modules/file/controllers/file.controller.ts');
    const notificationController = readSource('modules/notification/controllers/notification.controller.ts');
    expect(existsInSource('core/decorators/api-response.decorator.ts')).toBe(false);
    expect(existsInSource('core/decorators/api-docs.decorator.ts')).toBe(false);
    expect(existsInSource('core/decorators/api-example.decorator.ts')).toBe(false);
    expect(decoratorIndex).not.toContain("export * from './api-response.decorator'");
    expect(decoratorIndex).not.toContain("export * from './api-docs.decorator'");
    expect(decoratorIndex).not.toContain("export * from './api-example.decorator'");
    expect(authController).not.toContain('ApiSuccessResponse');
    expect(authController).not.toContain('ApiPublicResponses');
    expect(authController).not.toContain('ApiAuthResponses');
    expect(authController).not.toContain('ApiLoginExample');
    expect(userController).not.toContain('ApiSuccessResponse');
    expect(userController).not.toContain('ApiPaginatedResponse');
    expect(userController).not.toContain('ApiCommonResponses');
    expect(roleController).not.toContain('ApiSuccessResponse');
    expect(roleController).not.toContain('ApiPaginatedResponse');
    expect(permissionController).not.toContain('ApiSuccessResponse');
    expect(permissionController).not.toContain('ApiPaginatedResponse');
    expect(menuController).not.toContain('ApiSuccessResponse');
    expect(fileController).not.toContain('ApiSuccessResponse');
    expect(fileController).not.toContain('ApiPaginatedResponse');
    expect(fileController).not.toContain('ApiCommonResponses');
    expect(notificationController).not.toContain('ApiSuccessResponse');
    expect(notificationController).not.toContain('ApiPaginatedResponse');
  });

  it('keeps notification delivery to direct bark/feishu adapters without manager and token indirection', () => {
    const notificationModule = readSource('modules/notification/notification.module.ts');
    const notificationService = readSource('modules/notification/services/notification.service.ts');

    expect(notificationModule).not.toContain('NotificationChannelManager');
    expect(notificationModule).not.toContain('NOTIFICATION_CHANNEL_ADAPTERS');
    expect(notificationService).not.toContain('NotificationChannelManager');
    expect(existsInSource('modules/notification/channels/notification-channel.manager.ts')).toBe(
      false,
    );
    expect(existsInSource('modules/notification/channels/notification-channel.tokens.ts')).toBe(
      false,
    );
  });

  it('keeps current-user profile capability in user module only and avoids duplicate guard decoration', () => {
    const authController = readSource('modules/auth/controllers/auth.controller.ts');
    const apiAppController = readSource('modules/api-auth/controllers/api-app.controller.ts');
    const fileController = readSource('modules/file/controllers/file.controller.ts');

    expect(authController).not.toContain("@Get('profile')");
    expect(authController).not.toContain("@Get('check')");
    expect(apiAppController).not.toContain('@UseGuards(JwtAuthGuard)');
    expect(fileController).not.toContain('@Req() req');
    expect(fileController).not.toContain('const payload = req.body');
  });

  it('removes BaseService inheritance from business services', () => {
    const userService = readSource('modules/user/services/user.service.ts');
    const roleService = readSource('modules/role/services/role.service.ts');
    const menuService = readSource('modules/menu/services/menu.service.ts');
    const permissionService = readSource('modules/permission/services/permission.service.ts');
    const fileService = readSource('modules/file/services/file.service.ts');
    const notificationService = readSource('modules/notification/services/notification.service.ts');

    expect(existsInSource('core/base/base.service.ts')).toBe(false);
    for (const service of [
      userService,
      roleService,
      menuService,
      permissionService,
      fileService,
      notificationService,
    ]) {
      expect(service).not.toContain('extends BaseService');
      expect(service).not.toContain("from '~/core/base/base.service'");
    }
  });
});
