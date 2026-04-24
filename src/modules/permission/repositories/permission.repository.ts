import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindOneOptions, DeepPartial } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { PermissionEntity } from '../entities/permission.entity';
import { QueryPermissionDto } from '../dto/query-permission.dto';

@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
  ) {}

  create(data: DeepPartial<PermissionEntity>): PermissionEntity {
    return this.permissionRepo.create(data);
  }

  async save(entity: DeepPartial<PermissionEntity>): Promise<PermissionEntity> {
    return this.permissionRepo.save(entity);
  }

  async findOne(options: FindOneOptions<PermissionEntity>): Promise<PermissionEntity | null> {
    return this.permissionRepo.findOne(options);
  }

  async delete(id: number): Promise<void> {
    const result = await this.permissionRepo.delete(id);
    if (result.affected === 0) {
      throw BusinessException.notFound('Permission', id);
    }
  }

  async findByIds(ids: number[]): Promise<PermissionEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.permissionRepo.find({
      where: { id: In(ids) },
    });
  }

  /**
   * 根据编码查找权限
   */
  async findByCode(code: string): Promise<PermissionEntity | null> {
    return this.permissionRepo.findOne({ where: { code } });
  }

  /**
   * 根据模块查找权限列表
   */
  async findByModule(module: string): Promise<PermissionEntity[]> {
    return this.permissionRepo.find({
      where: { module },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * 检查编码是否已存在
   */
  async isCodeExist(code: string, excludeId?: number): Promise<boolean> {
    const qb = this.permissionRepo
      .createQueryBuilder('permission')
      .where('permission.code = :code', { code });

    if (excludeId) {
      qb.andWhere('permission.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  /**
   * 查询权限（分页、筛选）
   */
  async findWithQuery(query: QueryPermissionDto) {
    const qb = this.permissionRepo.createQueryBuilder('permission');

    // 筛选条件
    if (query.code) {
      qb.andWhere('permission.code LIKE :code', { code: `%${query.code}%` });
    }

    if (query.name) {
      qb.andWhere('permission.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.type) {
      qb.andWhere('permission.type = :type', { type: query.type });
    }

    if (query.module) {
      qb.andWhere('permission.module = :module', { module: query.module });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('permission.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    if (query.isSystem !== undefined) {
      qb.andWhere('permission.isSystem = :isSystem', {
        isSystem: query.isSystem,
      });
    }

    // 排序
    qb.orderBy('permission.module', 'ASC')
      .addOrderBy('permission.sort', 'ASC')
      .addOrderBy('permission.createdAt', 'ASC');

    // 分页
    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    return qb.getManyAndCount();
  }

  /**
   * 模块名称映射（英文代码 → 中文名称）
   */
  private readonly MODULE_NAME_MAP: Record<string, string> = {
    auth: '认证模块',
    user: '用户管理',
    role: '角色管理',
    permission: '权限管理',
    menu: '菜单管理',
    file: '文件管理',
    notification: '通知中心',
    'api-auth': 'API认证',
    'open-api': '开放API',
    health: '健康检查',
  };

  /**
   * 获取权限树（按模块分组）
   */
  async getPermissionTree(): Promise<any[]> {
    const permissions = await this.permissionRepo.find({
      where: { isActive: true },
      order: { module: 'ASC', sort: 'ASC' },
    });

    // 按模块分组
    const moduleMap = new Map<string, PermissionEntity[]>();

    for (const permission of permissions) {
      if (!moduleMap.has(permission.module)) {
        moduleMap.set(permission.module, []);
      }
      moduleMap.get(permission.module)!.push(permission);
    }

    // 构建树形结构（与前端类型定义一致）
    const tree: any[] = [];

    moduleMap.forEach((perms, module) => {
      tree.push({
        module: module, // 模块代码：auth
        name: this.MODULE_NAME_MAP[module] || module, // 模块名称：认证模块
        permissions: perms, // 完整的权限实体数组
      });
    });

    return tree;
  }
}
