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
});
