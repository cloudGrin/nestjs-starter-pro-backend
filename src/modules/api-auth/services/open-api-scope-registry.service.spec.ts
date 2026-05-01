import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService } from '@nestjs/core';
import { OpenApiEndpoint, OpenApiResourceController } from '../decorators/api-scopes.decorator';
import { OpenApiScopeRegistryService } from './open-api-scope-registry.service';

@OpenApiResourceController('open')
class TestOpenController {
  @Get('users')
  @OpenApiEndpoint({
    scope: 'read:users',
    label: '读取用户公开资料',
    description: '获取用户公开资料',
    group: { key: 'open-user', title: '用户公开资料' },
    summary: '获取用户公开资料列表',
  })
  listUsers() {
    return undefined;
  }

  @Get('users/:id')
  @OpenApiEndpoint({
    scope: 'read:users',
    label: '读取用户公开资料',
    description: '获取用户公开资料',
    group: { key: 'open-user', title: '用户公开资料' },
    summary: '获取用户公开资料详情',
  })
  getUser() {
    return undefined;
  }

  @Get('internal')
  internal() {
    return undefined;
  }
}

@OpenApiResourceController('open')
class ConflictingScopeController {
  @Get('accounts')
  @OpenApiEndpoint({
    scope: 'read:users',
    label: '读取账户资料',
    description: '读取账户资料',
    group: { key: 'open-account', title: '账户公开资料' },
    summary: '获取账户公开资料列表',
  })
  listAccounts() {
    return undefined;
  }
}

@OpenApiResourceController('open')
class InconsistentGroupController {
  @Get('profiles')
  @OpenApiEndpoint({
    scope: 'read:profiles',
    label: '读取资料',
    description: '读取资料',
    group: { key: 'open-user', title: '账户公开资料' },
    summary: '获取资料列表',
  })
  listProfiles() {
    return undefined;
  }
}

@OpenApiResourceController('open')
class OutOfModuleOpenController {
  @Get('users')
  @OpenApiEndpoint({
    scope: 'read:external-users',
    label: '读取外部用户',
    description: '读取外部用户',
    group: { key: 'open-external-user', title: '外部用户' },
    summary: '获取外部用户列表',
  })
  listUsers() {
    return undefined;
  }
}

@Controller('misconfigured-open')
class MisconfiguredOpenController {
  @Get('users')
  @OpenApiEndpoint({
    scope: 'read:misconfigured-users',
    label: '读取用户公开资料',
    description: '获取用户公开资料',
    group: { key: 'open-user', title: '用户公开资料' },
    summary: '获取用户公开资料列表',
  })
  listUsers() {
    return undefined;
  }
}

describe('OpenApiScopeRegistryService', () => {
  function createRegistry(
    controllers: Array<object | { instance: object; moduleName?: string }> = [
      new TestOpenController(),
    ],
  ) {
    const controllerWrappers = controllers.map((controller) => {
      if ('instance' in controller) {
        return {
          instance: controller.instance,
          host: { name: controller.moduleName ?? 'OpenApiModule' },
        };
      }

      return { instance: controller, host: { name: 'OpenApiModule' } };
    });

    const discoveryService = {
      getControllers: jest.fn().mockReturnValue(controllerWrappers),
    } as unknown as DiscoveryService;
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'app.apiPrefix') {
          return 'api';
        }
        if (key === 'app.apiVersion') {
          return '1';
        }
        return fallback;
      }),
    } as unknown as ConfigService;

    return new OpenApiScopeRegistryService(discoveryService, configService);
  }

  it('collects unique scopes and all documented endpoints from decorated controllers', () => {
    const groups = createRegistry().getApiScopeGroups();

    expect(groups).toEqual([
      {
        key: 'open-user',
        title: '用户公开资料',
        scopes: [
          {
            code: 'read:users',
            label: '读取用户公开资料',
            description: '获取用户公开资料',
          },
        ],
        endpoints: [
          {
            scope: 'read:users',
            method: 'GET',
            path: '/api/v1/open/users',
            summary: '获取用户公开资料列表',
            description: '获取用户公开资料',
          },
          {
            scope: 'read:users',
            method: 'GET',
            path: '/api/v1/open/users/:id',
            summary: '获取用户公开资料详情',
            description: '获取用户公开资料',
          },
        ],
      },
    ]);
  });

  it('exposes registered scope codes for API app and key validation', () => {
    expect(createRegistry().getRegisteredScopeCodes()).toEqual(new Set(['read:users']));
  });

  it('rejects conflicting definitions for the same scope code', () => {
    expect(() =>
      createRegistry([
        new TestOpenController(),
        new ConflictingScopeController(),
      ]).getApiScopeGroups(),
    ).toThrow('开放API权限范围定义冲突: read:users');
  });

  it('rejects documented endpoints outside the OpenAPI controller boundary', () => {
    expect(() => createRegistry([new MisconfiguredOpenController()]).getApiScopeGroups()).toThrow(
      '开放API接口必须使用 OpenApiResourceController: MisconfiguredOpenController.listUsers',
    );
  });

  it('rejects OpenAPI controllers registered outside OpenApiModule', () => {
    expect(() =>
      createRegistry([
        { instance: new OutOfModuleOpenController(), moduleName: 'UserModule' },
      ]).getApiScopeGroups(),
    ).toThrow('开放API接口必须注册在 OpenApiModule: OutOfModuleOpenController.listUsers');
  });

  it('rejects conflicting titles for the same scope group key', () => {
    expect(() =>
      createRegistry([
        new TestOpenController(),
        new InconsistentGroupController(),
      ]).getApiScopeGroups(),
    ).toThrow('开放API权限分组定义冲突: open-user');
  });
});
