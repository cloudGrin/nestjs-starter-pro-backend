import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { PaginationResult } from '~/common/types/pagination.types';
import { PermissionEntity } from '../entities/permission.entity';
import { CreatePermissionDto, UpdatePermissionDto, QueryPermissionDto } from '../dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PermissionService.name);
  }

  /**
   * 创建权限
   */
  async create(dto: CreatePermissionDto): Promise<PermissionEntity> {
    this.logger.debug(`准备创建权限 code=${dto.code}, name=${dto.name}`);

    // 检查编码是否已存在
    if (await this.isCodeExist(dto.code)) {
      this.logger.debug(`创建权限失败，编码已存在 code=${dto.code}`);
      throw new ConflictException(`权限编码 ${dto.code} 已存在`);
    }

    const entity = this.permissionRepo.create(dto);
    this.logger.debug(`权限实体构建完成，准备保存 code=${entity.code}`);
    const saved = await this.permissionRepo.save(entity);
    this.logger.debug(`权限保存成功 id=${saved.id}, code=${saved.code}`);

    this.logger.log(`创建权限: ${saved.name} (${saved.code})`);

    return saved;
  }

  /**
   * 更新权限
   */
  async update(id: number, dto: UpdatePermissionDto): Promise<PermissionEntity> {
    this.logger.debug(`准备更新权限 id=${id}, payload=${JSON.stringify(dto)}`);

    const entity = await this.findById(id);
    this.logger.debug(`更新权限时加载实体成功 id=${id}, 当前编码=${entity.code}`);

    // 如果要修改编码，检查新编码是否已存在
    if (dto.code && dto.code !== entity.code) {
      if (await this.isCodeExist(dto.code, id)) {
        this.logger.debug(`更新权限失败，新编码重复 id=${id}, code=${dto.code}`);
        throw new ConflictException(`权限编码 ${dto.code} 已存在`);
      }
      this.logger.debug(`更新权限编码通过校验 id=${id}, newCode=${dto.code}`);
    }

    Object.assign(entity, dto);
    this.logger.debug(`权限信息合并完成，准备保存 id=${id}`);
    const updated = await this.permissionRepo.save(entity);
    this.logger.debug(`权限更新保存成功 id=${updated.id}`);

    this.logger.log(`更新权限: ${updated.name} (ID: ${id})`);

    return updated;
  }

  /**
   * 删除权限
   */
  async delete(id: number): Promise<void> {
    this.logger.debug(`准备删除权限 id=${id}`);

    const entity = await this.permissionRepo.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!entity) {
      this.logger.debug(`查询权限详情失败，未找到权限 id=${id}`);
      throw new NotFoundException('权限不存在');
    }

    // 系统内置权限不能删除
    if (entity.isSystem) {
      this.logger.debug(`删除权限失败，系统权限禁止删除 id=${id}`);
      throw new BadRequestException('系统内置权限不能删除');
    }

    if (entity.roles && entity.roles.length > 0) {
      this.logger.debug(
        `删除权限失败，存在 ${entity.roles.length} 个角色正在使用 permissionId=${id}`,
      );
      throw new BadRequestException('该权限正在被角色使用，不能删除');
    }

    await this.permissionRepo.delete(id);
    this.logger.debug(`权限删除完成 id=${id}`);

    this.logger.log(`删除权限: ${entity.name} (ID: ${id})`);
  }

  /**
   * 查询权限详情
   */
  async findById(id: number): Promise<PermissionEntity> {
    this.logger.debug(`查询权限详情 id=${id}`);

    const entity = await this.permissionRepo.findOne({
      where: { id },
    });

    if (!entity) {
      this.logger.debug(`查询权限详情失败，未找到权限 id=${id}`);
      throw new NotFoundException('权限不存在');
    }

    this.logger.debug(`查询权限详情完成 id=${id}`);

    return entity;
  }

  /**
   * 查询权限列表（分页）
   */
  async findAll(query: QueryPermissionDto): Promise<PaginationResult<PermissionEntity>> {
    this.logger.debug(`查询权限列表，过滤条件=${JSON.stringify(query)}`);

    const [items, totalItems] = await this.findWithQuery(query);
    this.logger.debug(`查询权限列表完成，返回数量=${items.length}, 总数=${totalItems}`);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: query.limit || 20,
        totalPages: Math.ceil(totalItems / (query.limit || 20)),
        currentPage: query.page || 1,
      },
    };
  }

  /**
   * 获取权限树
   */
  async getPermissionTree(): Promise<any[]> {
    this.logger.debug('查询权限树');
    const tree = await this.buildPermissionTree();
    this.logger.debug(`查询权限树完成，节点数量=${Array.isArray(tree) ? tree.length : 0}`);
    return tree;
  }

  /**
   * 根据模块获取权限列表
   */
  async findByModule(module: string): Promise<PermissionEntity[]> {
    this.logger.debug(`根据模块查询权限 module=${module}`);
    const items = await this.permissionRepo.find({
      where: { module },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });
    this.logger.debug(`模块权限查询完成 module=${module}, 数量=${items.length}`);
    return items;
  }

  /**
   * 批量查询权限
   */
  async findByIds(ids: number[]): Promise<PermissionEntity[]> {
    if (!ids || ids.length === 0) {
      this.logger.debug('批量查询权限时未提供ID列表');
      return [];
    }

    this.logger.debug(`批量查询权限 ids=${JSON.stringify(ids)}`);
    const result = await this.permissionRepo.find({
      where: { id: In(ids) },
    });
    this.logger.debug(`批量查询权限完成，请求数量=${ids.length}, 返回数量=${result.length}`);
    return result;
  }

  private async isCodeExist(code: string, excludeId?: number): Promise<boolean> {
    const qb = this.permissionRepo
      .createQueryBuilder('permission')
      .where('permission.code = :code', { code });

    if (excludeId) {
      qb.andWhere('permission.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  private async findWithQuery(query: QueryPermissionDto): Promise<[PermissionEntity[], number]> {
    const qb = this.permissionRepo.createQueryBuilder('permission');

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

    const page = query.page || 1;
    const limit = query.limit || 20;

    qb.orderBy('permission.module', 'ASC')
      .addOrderBy('permission.sort', 'ASC')
      .addOrderBy('permission.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  private async buildPermissionTree(): Promise<any[]> {
    const permissions = await this.permissionRepo.find({
      where: { isActive: true },
      order: { module: 'ASC', sort: 'ASC' },
    });

    const moduleNameMap: Record<string, string> = {
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

    const moduleMap = new Map<string, PermissionEntity[]>();

    for (const permission of permissions) {
      if (!moduleMap.has(permission.module)) {
        moduleMap.set(permission.module, []);
      }
      moduleMap.get(permission.module)!.push(permission);
    }

    const tree: any[] = [];
    moduleMap.forEach((perms, module) => {
      tree.push({
        module,
        name: moduleNameMap[module] || module,
        permissions: perms,
      });
    });

    return tree;
  }
}
