import { Injectable, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import {
  ApiEndpointDefinition,
  ApiScopeDefinition,
  ApiScopeGroup,
  OPEN_API_CONTROLLER_KEY,
  OPEN_API_ENDPOINT_KEY,
  OpenApiEndpointMetadata,
} from '../constants/api-scopes.constant';

interface RegisteredScopeDefinition {
  groupKey: string;
  groupTitle: string;
  label: string;
  description: string;
}

@Injectable()
export class OpenApiScopeRegistryService {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  getApiScopeGroups(): ApiScopeGroup[] {
    const groups = new Map<
      string,
      ApiScopeGroup & {
        scopeCodes: Set<string>;
      }
    >();
    const registeredScopes = new Map<string, RegisteredScopeDefinition>();

    for (const wrapper of this.discoveryService.getControllers()) {
      const instance = wrapper.instance;
      if (!instance) {
        continue;
      }

      const prototype = Object.getPrototypeOf(instance);
      const controllerPaths = this.toPathList(
        Reflect.getMetadata(PATH_METADATA, instance.constructor),
      );

      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        if (methodName === 'constructor') {
          continue;
        }

        const handler = prototype[methodName];
        if (typeof handler !== 'function') {
          continue;
        }

        const metadata = Reflect.getMetadata(OPEN_API_ENDPOINT_KEY, handler) as
          | OpenApiEndpointMetadata
          | undefined;
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          | RequestMethod
          | undefined;

        if (!metadata || requestMethod === undefined) {
          continue;
        }

        this.assertOpenApiControllerBoundary(instance, methodName);
        this.assertScopeDefinitionConsistent(registeredScopes, metadata);

        const group = this.getOrCreateGroup(groups, metadata);
        if (!group.scopeCodes.has(metadata.scope)) {
          group.scopes.push(this.toScopeDefinition(metadata));
          group.scopeCodes.add(metadata.scope);
        }

        for (const controllerPath of controllerPaths) {
          for (const methodPath of this.toPathList(Reflect.getMetadata(PATH_METADATA, handler))) {
            group.endpoints.push(
              this.toEndpointDefinition(metadata, requestMethod, controllerPath, methodPath),
            );
          }
        }
      }
    }

    return Array.from(groups.values()).map(({ scopeCodes: _scopeCodes, ...group }) => group);
  }

  getRegisteredScopeCodes(): Set<string> {
    return new Set(
      this.getApiScopeGroups().flatMap((group) => group.scopes.map((scope) => scope.code)),
    );
  }

  private getOrCreateGroup(
    groups: Map<string, ApiScopeGroup & { scopeCodes: Set<string> }>,
    metadata: OpenApiEndpointMetadata,
  ): ApiScopeGroup & { scopeCodes: Set<string> } {
    const current = groups.get(metadata.group.key);
    if (current) {
      return current;
    }

    const group = {
      key: metadata.group.key,
      title: metadata.group.title,
      scopes: [],
      endpoints: [],
      scopeCodes: new Set<string>(),
    } satisfies ApiScopeGroup & { scopeCodes: Set<string> };

    groups.set(group.key, group);
    return group;
  }

  private assertOpenApiControllerBoundary(instance: object, methodName: string): void {
    const controllerClass = instance.constructor;
    if (Reflect.getMetadata(OPEN_API_CONTROLLER_KEY, controllerClass)) {
      return;
    }

    throw new Error(
      `开放API接口必须使用 OpenApiResourceController: ${controllerClass.name}.${methodName}`,
    );
  }

  private assertScopeDefinitionConsistent(
    registeredScopes: Map<string, RegisteredScopeDefinition>,
    metadata: OpenApiEndpointMetadata,
  ): void {
    const current = {
      groupKey: metadata.group.key,
      groupTitle: metadata.group.title,
      label: metadata.label,
      description: metadata.description,
    };
    const existing = registeredScopes.get(metadata.scope);

    if (!existing) {
      registeredScopes.set(metadata.scope, current);
      return;
    }

    if (
      existing.groupKey !== current.groupKey ||
      existing.groupTitle !== current.groupTitle ||
      existing.label !== current.label ||
      existing.description !== current.description
    ) {
      throw new Error(`开放API权限范围定义冲突: ${metadata.scope}`);
    }
  }

  private toScopeDefinition(metadata: OpenApiEndpointMetadata): ApiScopeDefinition {
    return {
      code: metadata.scope,
      label: metadata.label,
      description: metadata.description,
    };
  }

  private toEndpointDefinition(
    metadata: OpenApiEndpointMetadata,
    requestMethod: RequestMethod,
    controllerPath: string,
    methodPath: string,
  ): ApiEndpointDefinition {
    return {
      scope: metadata.scope,
      method: RequestMethod[requestMethod],
      path: this.buildEndpointPath(controllerPath, methodPath),
      summary: metadata.summary,
      description: metadata.description,
    };
  }

  private buildEndpointPath(controllerPath: string, methodPath: string): string {
    const apiPrefix = this.normalizePathPart(
      this.configService.get<string>('app.apiPrefix', 'api'),
    );
    const apiVersion = this.normalizeApiVersion(
      this.configService.get<string>('app.apiVersion', '1'),
    );
    return `/${[apiPrefix, apiVersion, controllerPath, methodPath]
      .map((part) => this.normalizePathPart(part))
      .filter(Boolean)
      .join('/')}`;
  }

  private normalizeApiVersion(version: string): string {
    const normalized = this.normalizePathPart(version);
    if (!normalized) {
      return '';
    }
    return normalized.startsWith('v') ? normalized : `v${normalized}`;
  }

  private normalizePathPart(path: string): string {
    return String(path ?? '').replace(/^\/+|\/+$/g, '');
  }

  private toPathList(path: string | string[] | undefined): string[] {
    if (Array.isArray(path)) {
      return path;
    }
    return [path ?? ''];
  }
}
