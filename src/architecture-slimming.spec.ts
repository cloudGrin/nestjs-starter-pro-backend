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
    const userController = readSource('modules/user/controllers/user.controller.ts');
    const menuController = readSource('modules/menu/controllers/menu.controller.ts');

    expect(authController).not.toContain("@Get('profile')");
    expect(authController).not.toContain("@Get('check')");
    expect(apiAppController).not.toContain('@UseGuards(JwtAuthGuard)');
    expect(apiAppController).toContain('@CurrentUser() user');
    expect(fileController).not.toContain('@Req() req');
    expect(fileController).not.toContain('const payload = req.body');
    expect(userController).toContain('@CurrentUser() user');
    expect(userController).not.toContain('@Req() req');
    expect(menuController).toContain('@CurrentUser() user');
    expect(menuController).not.toContain('@Req() req');
    expect(existsInSource('modules/api-auth/types/request.types.ts')).toBe(false);
  });

  it('uses real DTOs for role controller query and mutation payloads instead of runtime-only inline types', () => {
    const roleController = readSource('modules/role/controllers/role.controller.ts');

    expect(roleController).toContain('QueryRoleDto');
    expect(roleController).toContain('UpdateRoleDto');
    expect(roleController).toContain('AssignPermissionsDto');
    expect(roleController).not.toContain('query: {');
    expect(roleController).not.toContain('Partial<CreateRoleDto>');
    expect(roleController).not.toContain('@Body() permissionIds: number[]');
  });

  it('uses DTOs and response mappers for menu path validation and open api user responses', () => {
    const menuController = readSource('modules/menu/controllers/menu.controller.ts');
    const openApiController = readSource('modules/open-api/controllers/open-api.controller.ts');

    expect(menuController).toContain('ValidateMenuPathDto');
    expect(menuController).not.toContain("@Query('path') path: string");
    expect(menuController).not.toContain("@Query('excludeId') excludeIdStr?: string");
    expect(menuController).not.toContain('parseInt(excludeIdStr, 10)');
    expect(openApiController).toContain('OpenUserListResponseDto');
    expect(openApiController).not.toContain('result.items.map((user: any) => ({');
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

  it('removes BaseRepository inheritance from repositories and keeps only shared pagination types', () => {
    expect(existsInSource('core/base/base.repository.ts')).toBe(false);
    expect(existsInSource('modules/api-auth/repositories/api-app.repository.ts')).toBe(false);
    expect(existsInSource('modules/api-auth/repositories/api-key.repository.ts')).toBe(false);
    expect(existsInSource('modules/auth/repositories/refresh-token.repository.ts')).toBe(false);
    expect(existsInSource('modules/user/repositories/user.repository.ts')).toBe(false);
    expect(existsInSource('modules/role/repositories/role.repository.ts')).toBe(false);
    expect(existsInSource('modules/permission/repositories/permission.repository.ts')).toBe(false);
    expect(existsInSource('modules/menu/repositories/menu.repository.ts')).toBe(false);
    expect(existsInSource('modules/file/repositories/file.repository.ts')).toBe(false);
    expect(existsInSource('modules/notification/repositories/notification.repository.ts')).toBe(
      false,
    );
  });

  it('injects direct TypeORM repositories into menu, file, and notification services', () => {
    const menuModule = readSource('modules/menu/menu.module.ts');
    const menuService = readSource('modules/menu/services/menu.service.ts');
    const fileModule = readSource('modules/file/file.module.ts');
    const fileService = readSource('modules/file/services/file.service.ts');
    const notificationModule = readSource('modules/notification/notification.module.ts');
    const notificationService = readSource('modules/notification/services/notification.service.ts');

    expect(menuModule).not.toContain('MenuRepository');
    expect(menuService).not.toContain('MenuRepository');
    expect(menuService).toContain('@InjectRepository(MenuEntity)');
    expect(fileModule).not.toContain('FileRepository');
    expect(fileService).not.toContain('FileRepository');
    expect(fileService).toContain('@InjectRepository(FileEntity)');
    expect(notificationModule).not.toContain('NotificationRepository');
    expect(notificationService).not.toContain('NotificationRepository');
    expect(notificationService).toContain('@InjectRepository(NotificationEntity)');
  });

  it('reads bootstrap settings from structured config paths instead of raw env keys', () => {
    const main = readSource('main.ts');

    expect(main).toContain("configService.get<string | string[]>('cors.origin'");
    expect(main).toContain("configService.get<boolean>('cors.credentials'");
    expect(main).toContain("configService.get<string>('app.apiPrefix'");
    expect(main).toContain("configService.get<string>('app.apiVersion'");
    expect(main).toContain("configService.get<boolean>('swagger.enable'");
    expect(main).toContain("configService.get<string>('swagger.title'");
    expect(main).toContain("configService.get<string>('swagger.description'");
    expect(main).toContain("configService.get<string>('swagger.version'");
    expect(main).toContain("configService.get<string>('swagger.path'");
    expect(main).toContain("configService.get<number>('app.port'");
    expect(main).not.toContain("configService.get<string>('CORS_ORIGIN'");
    expect(main).not.toContain("configService.get<boolean>('CORS_CREDENTIALS'");
    expect(main).not.toContain("configService.get<string>('API_PREFIX'");
    expect(main).not.toContain("configService.get<string>('API_VERSION'");
    expect(main).not.toContain("configService.get<boolean>('SWAGGER_ENABLE'");
    expect(main).not.toContain("configService.get<string>('SWAGGER_TITLE'");
    expect(main).not.toContain("configService.get<string>('SWAGGER_DESCRIPTION'");
    expect(main).not.toContain("configService.get<string>('SWAGGER_VERSION'");
    expect(main).not.toContain("configService.get<string>('SWAGGER_PATH'");
    expect(main).not.toContain("configService.get<number>('PORT'");
  });

  it('keeps shared infrastructure imported only at app root and avoids unnecessary global/export module patterns', () => {
    const appModule = readSource('app.module.ts');
    const sharedModule = readSource('shared/shared.module.ts');
    const authModule = readSource('modules/auth/auth.module.ts');
    const apiAuthModule = readSource('modules/api-auth/api-auth.module.ts');
    const cronModule = readSource('modules/cron/cron.module.ts');
    const healthModule = readSource('modules/health/health.module.ts');

    expect(sharedModule).toContain('@Global()');
    expect(appModule).toContain('SharedModule');
    expect(authModule).not.toContain('@Global()');
    expect(authModule).not.toContain('exports: [AuthService, JwtModule]');
    expect(apiAuthModule).not.toContain('SharedModule');
    expect(cronModule).not.toContain('exports: [CronService]');
    expect(healthModule).not.toContain('exports: [HealthService]');
  });

  it('injects direct TypeORM repositories for auth/api-auth instead of extra thin repository wrappers', () => {
    const apiAuthModule = readSource('modules/api-auth/api-auth.module.ts');
    const apiAuthService = readSource('modules/api-auth/services/api-auth.service.ts');
    const authModule = readSource('modules/auth/auth.module.ts');
    const authService = readSource('modules/auth/services/auth.service.ts');
    const userModule = readSource('modules/user/user.module.ts');
    const userService = readSource('modules/user/services/user.service.ts');
    const notificationService = readSource('modules/notification/services/notification.service.ts');
    const roleModule = readSource('modules/role/role.module.ts');
    const roleService = readSource('modules/role/services/role.service.ts');
    const permissionModule = readSource('modules/permission/permission.module.ts');
    const permissionService = readSource('modules/permission/services/permission.service.ts');

    expect(apiAuthModule).not.toContain('ApiAppRepository');
    expect(apiAuthModule).not.toContain('ApiKeyRepository');
    expect(apiAuthService).not.toContain('ApiAppRepository');
    expect(apiAuthService).not.toContain('ApiKeyRepository');
    expect(authModule).not.toContain('RefreshTokenRepository');
    expect(authService).not.toContain('RefreshTokenRepository');
    expect(userModule).not.toContain('UserRepository');
    expect(userService).not.toContain('UserRepository');
    expect(notificationService).not.toContain('UserRepository');
    expect(roleModule).not.toContain('RoleRepository');
    expect(roleService).not.toContain('RoleRepository');
    expect(permissionModule).not.toContain('PermissionRepository');
    expect(permissionService).not.toContain('PermissionRepository');
    expect(existsInSource('modules/api-auth/repositories/api-app.repository.ts')).toBe(false);
    expect(existsInSource('modules/api-auth/repositories/api-key.repository.ts')).toBe(false);
    expect(existsInSource('modules/auth/repositories/refresh-token.repository.ts')).toBe(false);
    expect(existsInSource('modules/user/repositories/user.repository.ts')).toBe(false);
    expect(existsInSource('modules/role/repositories/role.repository.ts')).toBe(false);
    expect(existsInSource('modules/permission/repositories/permission.repository.ts')).toBe(false);
  });
});
