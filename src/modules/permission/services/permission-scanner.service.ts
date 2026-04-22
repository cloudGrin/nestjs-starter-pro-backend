import { Injectable, OnModuleInit, RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { PermissionEntity, PermissionType } from '../entities/permission.entity';
import { PERMISSIONS_KEY } from '~/core/decorators/require-permissions.decorator';

/**
 * 权限扫描 DTO
 */
interface ScannedPermission {
  code: string;
  name: string;
  module: string;
  type: PermissionType;
  httpMeta?: {
    method: string;
    path: string;
  }[];
  description?: string;
  sort?: number;
}

/**
 * 权限扫描服务
 * 职责：
 * 1. 启动时自动扫描所有控制器的 @RequirePermissions 装饰器
 * 2. 提取权限信息并同步到数据库
 * 3. 自动关联 HTTP 路由信息
 *
 * 这样开发人员只需要在代码中添加装饰器，权限点会自动同步
 */
@Injectable()
export class PermissionScannerService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PermissionScannerService.name);
  }

  /**
   * 模块初始化时自动扫描权限
   */
  async onModuleInit() {
    // 可以通过环境变量控制是否自动扫描
    const autoScan = process.env.AUTO_SCAN_PERMISSIONS !== 'false';

    if (autoScan) {
      this.logger.log('开始自动扫描权限点...');
      await this.scanAndSync();
      this.logger.log('权限点扫描完成');
    }
  }

  /**
   * 扫描并同步权限点
   */
  async scanAndSync(): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    const controllers = this.discoveryService.getControllers();
    const scannedPermissions = new Map<string, ScannedPermission>();

    // 1. 扫描所有控制器
    for (const controller of controllers) {
      this.scanController(controller, scannedPermissions);
    }

    this.logger.log(`扫描到 ${scannedPermissions.size} 个权限点`);

    // 2. 同步到数据库
    const result = await this.syncToDatabase(Array.from(scannedPermissions.values()));

    return result;
  }

  /**
   * 扫描单个控制器
   */
  private scanController(
    wrapper: InstanceWrapper,
    permissions: Map<string, ScannedPermission>,
  ): void {
    const { instance, metatype } = wrapper;

    if (!instance || !metatype) {
      return;
    }

    // 获取控制器的路由前缀
    const controllerPath = this.reflector.get<string>('path', metatype) || '';
    const controllerName = metatype.name.replace('Controller', '');

    // 提取模块名（如 UserController -> user）
    const module = this.extractModuleName(controllerName);

    // 扫描控制器的所有方法
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = this.metadataScanner.getAllMethodNames(prototype);

    for (const methodName of methodNames) {
      const methodRef = prototype[methodName];

      // 获取方法的权限元数据
      const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, methodRef);

      if (!requiredPermissions || requiredPermissions.length === 0) {
        continue;
      }

      // 获取 HTTP 方法和路径
      const httpMethod = this.getHttpMethod(methodRef);
      const methodPath = this.reflector.get<string>('path', methodRef) || '';
      const fullPath = this.buildFullPath(controllerPath, methodPath);

      // 处理每个权限
      for (const permissionCode of requiredPermissions) {
        if (permissions.has(permissionCode)) {
          // 权限已存在，添加HTTP元数据
          const existing = permissions.get(permissionCode)!;
          if (httpMethod && fullPath) {
            existing.httpMeta = existing.httpMeta || [];
            existing.httpMeta.push({ method: httpMethod, path: fullPath });
          }
        } else {
          // 新权限
          permissions.set(permissionCode, {
            code: permissionCode,
            name: this.generatePermissionName(permissionCode),
            module: this.extractModuleFromCode(permissionCode) || module,
            type: PermissionType.API,
            httpMeta: httpMethod && fullPath ? [{ method: httpMethod, path: fullPath }] : undefined,
            description: `${controllerName}.${methodName}`,
          });
        }
      }
    }
  }

  /**
   * 同步到数据库
   */
  private async syncToDatabase(scannedPermissions: ScannedPermission[]): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const scanned of scannedPermissions) {
      try {
        const existing = await this.permissionRepo.findOne({
          where: { code: scanned.code },
        });

        if (existing) {
          // 权限已存在，检查是否需要更新
          let needUpdate = false;

          // 更新 HTTP 元数据（合并新旧）
          if (scanned.httpMeta && scanned.httpMeta.length > 0) {
            const existingMeta = existing.httpMeta || [];
            const newMeta = scanned.httpMeta;

            // 去重合并
            const mergedMeta = [...existingMeta];
            for (const meta of newMeta) {
              const exists = mergedMeta.some(
                (m) => m.method === meta.method && m.path === meta.path,
              );
              if (!exists) {
                mergedMeta.push(meta);
                needUpdate = true;
              }
            }

            if (needUpdate) {
              existing.httpMeta = mergedMeta;
            }
          }

          // 如果模块名不同，更新模块名
          if (existing.module !== scanned.module) {
            existing.module = scanned.module;
            needUpdate = true;
          }

          if (needUpdate) {
            await this.permissionRepo.save(existing);
            updated++;
            this.logger.debug(`更新权限: ${scanned.code}`);
          } else {
            skipped++;
          }
        } else {
          // 创建新权限
          const newPermission = this.permissionRepo.create({
            code: scanned.code,
            name: scanned.name,
            module: scanned.module,
            type: scanned.type,
            httpMeta: scanned.httpMeta,
            description: scanned.description,
            sort: scanned.sort || 0,
            isActive: true,
            isSystem: true, // 自动扫描的权限标记为系统内置
          });

          await this.permissionRepo.save(newPermission);
          created++;
          this.logger.debug(`创建权限: ${scanned.code}`);
        }
      } catch (error) {
        this.logger.error(`同步权限 ${scanned.code} 失败: ${error.message}`);
      }
    }

    this.logger.log(
      `权限同步完成 - 总计: ${scannedPermissions.length}, 创建: ${created}, 更新: ${updated}, 跳过: ${skipped}`,
    );

    return {
      total: scannedPermissions.length,
      created,
      updated,
      skipped,
    };
  }

  /**
   * 获取HTTP方法
   */
  private getHttpMethod(methodRef: any): string | null {
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    for (const method of httpMethods) {
      if (Reflect.getMetadata(`__method__${method}__`, methodRef)) {
        return method;
      }
    }

    // 尝试通过其他元数据获取（RequestMethod是枚举，需要转换为字符串）
    const requestMethod = Reflect.getMetadata('method', methodRef);
    if (requestMethod !== undefined && requestMethod !== null) {
      // 如果是字符串，直接返回大写
      if (typeof requestMethod === 'string') {
        return requestMethod.toUpperCase();
      }

      // 如果是数字（RequestMethod枚举），转换为字符串
      if (typeof requestMethod === 'number') {
        return RequestMethod[requestMethod] || null;
      }
    }

    return null;
  }

  /**
   * 构建完整路径
   */
  private buildFullPath(controllerPath: string, methodPath: string): string {
    const cleanControllerPath = controllerPath.replace(/^\//, '').replace(/\/$/, '');
    const cleanMethodPath = methodPath.replace(/^\//, '').replace(/\/$/, '');

    if (!cleanControllerPath && !cleanMethodPath) {
      return '/';
    }

    if (!cleanControllerPath) {
      return `/${cleanMethodPath}`;
    }

    if (!cleanMethodPath) {
      return `/${cleanControllerPath}`;
    }

    return `/${cleanControllerPath}/${cleanMethodPath}`;
  }

  /**
   * 从权限代码提取模块名
   * 如: user:create -> user
   */
  private extractModuleFromCode(code: string): string | null {
    const parts = code.split(':');
    return parts.length > 0 ? parts[0] : null;
  }

  /**
   * 提取模块名
   * 如: UserController -> user
   */
  private extractModuleName(controllerName: string): string {
    // 将 PascalCase 转换为 kebab-case
    return controllerName
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }

  /**
   * 生成权限名称
   * 如: user:create -> 创建用户
   */
  private generatePermissionName(code: string): string {
    const parts = code.split(':');

    if (parts.length < 2) {
      return code;
    }

    const actionMap: Record<string, string> = {
      create: '创建',
      read: '查看',
      query: '查询',
      update: '更新',
      edit: '编辑',
      delete: '删除',
      remove: '删除',
      export: '导出',
      import: '导入',
      approve: '审批',
      reject: '拒绝',
      manage: '管理',
    };

    const moduleMap: Record<string, string> = {
      user: '用户',
      role: '角色',
      permission: '权限',
      menu: '菜单',
      dict: '字典',
      config: '配置',
      log: '日志',
      task: '任务',
      file: '文件',
    };

    const [module, action] = parts;
    const moduleName = moduleMap[module] || module;
    const actionName = actionMap[action] || action;

    return `${actionName}${moduleName}`;
  }

  /**
   * 手动触发同步（提供给API调用）
   */
  async manualSync(): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    this.logger.log('手动触发权限扫描...');
    return this.scanAndSync();
  }
}
