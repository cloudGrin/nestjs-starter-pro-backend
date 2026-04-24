import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { CACHE_KEYS } from '~/common/constants/cache.constants';
import { TreeUtil } from '~/common/utils/tree.util';
import { MenuEntity } from '../entities/menu.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { MenuRepository } from '../repositories/menu.repository';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from '../dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly menuRepo: MenuRepository,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(MenuService.name);
  }

  /**
   * 创建菜单
   */
  async create(dto: CreateMenuDto): Promise<MenuEntity> {
    this.logger.debug(
      `准备创建菜单 name=${dto.name}, path=${dto.path}, parentId=${dto.parentId ?? '无'}`,
    );

    // 如果指定了父菜单，检查父菜单是否存在
    if (dto.parentId) {
      const parent = await this.menuRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        this.logger.debug(`创建菜单失败，父菜单不存在 parentId=${dto.parentId}`);
        throw new NotFoundException(`父菜单 ID ${dto.parentId} 不存在`);
      }
      this.logger.debug(`创建菜单时找到父菜单 parentId=${dto.parentId}, name=${parent.name}`);
    }

    const entity = this.menuRepo.create(dto);
    this.logger.debug(`菜单实体构建完成，准备保存 name=${entity.name}`);
    const saved = await this.menuRepo.save(entity);
    this.logger.debug(`菜单保存成功 id=${saved.id}, name=${saved.name}`);

    await this.clearMenuCache();
    await this.clearMenuRelatedCache();
    this.logger.debug('创建菜单后清理菜单缓存完成');

    this.logger.log(`创建菜单: ${saved.name}`);

    return saved;
  }

  /**
   * 更新菜单
   */
  async update(id: number, dto: UpdateMenuDto): Promise<MenuEntity> {
    this.logger.debug(`准备更新菜单 id=${id}, payload=${JSON.stringify(dto)}`);

    const entity = await this.findById(id);
    this.logger.debug(`更新菜单时加载实体成功 id=${id}, 当前父ID=${entity.parentId ?? '无'}`);

    // 如果要修改父菜单，检查不能设置为自己或子孙节点
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        this.logger.debug(`更新菜单失败，父菜单不能是自己 id=${id}`);
        throw new BadRequestException('父菜单不能是自己');
      }

      if (dto.parentId) {
        const parent = await this.menuRepo.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          this.logger.debug(`更新菜单失败，父菜单不存在 id=${id}, parentId=${dto.parentId}`);
          throw new NotFoundException(`父菜单 ID ${dto.parentId} 不存在`);
        }

        // 检查是否会形成循环依赖
        const hasCircular = await this.checkCircularDependency(id, dto.parentId);
        if (hasCircular) {
          this.logger.debug(`更新菜单失败，检测到循环依赖 id=${id}, targetParent=${dto.parentId}`);
          throw new BadRequestException('不能将菜单移动到自己或其子菜单下,这会形成循环依赖');
        }
        this.logger.debug(`更新菜单父级校验通过 id=${id}, targetParent=${dto.parentId}`);
      }
    }

    Object.assign(entity, dto);
    this.logger.debug(`菜单信息合并完成，准备保存 id=${id}`);
    const updated = await this.menuRepo.save(entity);
    this.logger.debug(`菜单更新保存成功 id=${updated.id}`);

    await this.clearMenuCache();
    await this.clearMenuRelatedCache();
    this.logger.debug(`更新菜单后清理缓存完成 menuId=${updated.id}`);

    this.logger.log(`更新菜单: ${updated.name} (ID: ${id})`);

    return updated;
  }

  /**
   * 删除菜单
   */
  async delete(id: number): Promise<void> {
    this.logger.debug(`准备删除菜单 id=${id}`);

    const entity = await this.findById(id);

    // 检查是否有子菜单
    const children = await this.menuRepo.findByParentId(id);
    if (children.length > 0) {
      this.logger.debug(`删除菜单失败，存在 ${children.length} 个子菜单 id=${id}`);
      throw new BadRequestException('存在子菜单，无法删除');
    }

    await this.menuRepo.softDelete(id);
    this.logger.debug(`菜单软删除完成 id=${id}`);

    await this.clearMenuCache();
    await this.clearMenuRelatedCache();
    this.logger.debug(`删除菜单后清理缓存完成 menuId=${id}`);

    this.logger.log(`删除菜单: ${entity.name} (ID: ${id})`);
  }

  /**
   * 查询菜单详情
   */
  async findById(id: number): Promise<MenuEntity> {
    this.logger.debug(`查询菜单详情 id=${id}`);

    const entity = await this.menuRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!entity) {
      this.logger.debug(`查询菜单详情失败，未找到菜单 id=${id}`);
      throw new NotFoundException('菜单不存在');
    }

    this.logger.debug(`查询菜单详情完成 id=${id}, 子菜单数量=${entity.children?.length || 0}`);

    return entity;
  }

  /**
   * 查询菜单列表
   */
  async findAll(query: QueryMenuDto): Promise<MenuEntity[]> {
    this.logger.debug(`查询菜单列表，过滤条件=${JSON.stringify(query)}`);
    const menus = await this.menuRepo.findWithQuery(query);
    this.logger.debug(`查询菜单列表完成，返回数量=${menus.length}`);
    return menus;
  }

  /**
   * 获取菜单树
   */
  async getMenuTree(): Promise<any[]> {
    this.logger.debug('查询菜单树');
    const menus = await this.menuRepo.find({
      where: { isActive: true },
      order: { sort: 'ASC' },
    });

    this.logger.debug(`菜单树查询原始数据数量=${menus.length}`);

    // 转换为树形结构
    const tree = TreeUtil.arrayToTree(menus, {
      idKey: 'id',
      parentKey: 'parentId',
      childrenKey: 'children',
    });
    this.logger.debug(`菜单树转换完成，根节点数量=${Array.isArray(tree) ? tree.length : 0}`);
    return tree;
  }

  /**
   * 转换为前端路由格式
   */
  private transformToRoutes(menus: MenuEntity[]): any[] {
    return menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      path: menu.path,
      type: menu.type, // 菜单类型（directory 或 menu）
      icon: menu.icon, // 图标名称
      component: menu.component,
      isVisible: menu.isVisible,
      isActive: menu.isActive,
      meta: menu.meta || {
        title: menu.name,
        icon: menu.icon,
      },
      children:
        menu.children && menu.children.length > 0
          ? this.transformToRoutes(menu.children)
          : undefined,
    }));
  }

  // ==================== 🆕 新增方法 ====================

  /**
   * 获取用户菜单(基于角色)
   */
  async getUserMenusByRoles(userId: number, roleCodes: string[]): Promise<any[]> {
    this.logger.debug(
      `根据角色获取用户菜单 userId=${userId}, roleCodes=${JSON.stringify(roleCodes)}`,
    );

    let menus: MenuEntity[];

    // 1. 超级管理员特殊处理：自动拥有所有菜单
    if (roleCodes.includes('super_admin')) {
      this.logger.debug(`用户${userId}拥有super_admin角色，返回所有菜单`);
      menus = await this.menuRepo.find({
        where: { isActive: true, isVisible: true },
        order: { sort: 'ASC' },
      });
      this.logger.debug(`super_admin获取到所有菜单数量=${menus.length}`);
    } else {
      // 2. 普通用户：查询用户的所有角色及其菜单
      const roles = await this.roleRepository
        .createQueryBuilder('role')
        .leftJoinAndSelect('role.menus', 'menu')
        .where('role.code IN (:...codes)', { codes: roleCodes })
        .andWhere('role.isActive = :isActive', { isActive: true })
        .getMany();

      this.logger.debug(`查询角色及关联菜单结果 userId=${userId}, 角色数量=${roles.length}`);

      const menuSet = new Set<MenuEntity>();

      // 3. 收集所有菜单
      for (const role of roles) {
        if (role.menus) {
          role.menus.forEach((menu) => {
            if (menu.isActive && menu.isVisible) {
              menuSet.add(menu);
            }
          });
        }
        this.logger.debug(`角色 ${role.code} 菜单数量=${role.menus?.length || 0}`);
      }

      menus = Array.from(menuSet);
      this.logger.debug(`根据角色汇总菜单数量=${menus.length}`);
    }

    // 4. 构建树形结构
    const menuTree = TreeUtil.arrayToTree(menus, {
      idKey: 'id',
      parentKey: 'parentId',
      childrenKey: 'children',
    });
    this.logger.debug(
      `角色菜单树构建完成，根节点数量=${Array.isArray(menuTree) ? menuTree.length : 0}`,
    );

    // 5. 转换为前端路由格式
    const routes = this.transformToRoutes(menuTree);
    this.logger.debug(`角色菜单转换为路由完成，路由数量=${routes.length}`);
    return routes;
  }

  /**
   * 循环依赖检测
   */
  async checkCircularDependency(
    menuId: number,
    targetParentId: number,
    menuRepository: Pick<MenuRepository, 'findOne'> = this.menuRepo,
  ): Promise<boolean> {
    this.logger.debug(`检查菜单循环依赖 menuId=${menuId}, targetParentId=${targetParentId}`);

    if (menuId === targetParentId) {
      this.logger.debug('检测到直接循环依赖（自身作为父节点）');
      return true; // 不能把自己设为父节点
    }

    const visited = new Set<number>();
    let currentId: number | null = targetParentId;

    while (currentId !== null) {
      if (visited.has(currentId)) {
        this.logger.debug(`检测到循环依赖 visitedId=${currentId}`);
        return true; // 检测到循环
      }

      visited.add(currentId);

      if (currentId === menuId) {
        this.logger.debug(`检测到循环依赖，目标节点是当前节点的子孙 currentId=${currentId}`);
        return true; // 目标父节点是当前节点的子孙
      }

      // 查询父节点
      const parent = await menuRepository.findOne({
        where: { id: currentId },
        select: ['id', 'parentId'],
      });

      currentId = parent?.parentId || null;
    }

    this.logger.debug('循环依赖检测通过');
    return false; // 无循环
  }

  /**
   * 移动菜单
   */
  async moveMenu(id: number, targetParentId: number | null): Promise<MenuEntity> {
    this.logger.debug(`准备移动菜单 id=${id}, targetParentId=${targetParentId}`);

    return await this.menuRepo.transaction(async (transactionalRepo) => {
      const menu = await transactionalRepo.findOne({
        where: { id },
      });

      if (!menu) {
        this.logger.debug(`移动菜单失败，菜单不存在 id=${id}`);
        throw new NotFoundException('菜单不存在');
      }

      if (targetParentId !== null) {
        const parent = await transactionalRepo.findOne({
          where: { id: targetParentId },
        });

        if (!parent) {
          this.logger.debug(
            `移动菜单失败，父菜单不存在 id=${id}, targetParentId=${targetParentId}`,
          );
          throw new NotFoundException(`父菜单 ID ${targetParentId} 不存在`);
        }

        const hasCircular = await this.checkCircularDependency(id, targetParentId, transactionalRepo);
        if (hasCircular) {
          this.logger.debug(
            `移动菜单失败，检测到循环依赖 id=${id}, targetParentId=${targetParentId}`,
          );
          throw new BadRequestException('不能将菜单移动到自己或其子菜单下,这会形成循环依赖');
        }
        this.logger.debug(`移动菜单父节点校验通过 id=${id}, targetParentId=${targetParentId}`);
      }

      const oldParentId = menu.parentId;
      menu.parentId = targetParentId;

      const saved = await transactionalRepo.save(menu);
      this.logger.debug(
        `菜单移动保存成功 id=${id}, oldParentId=${oldParentId ?? '无'}, newParentId=${saved.parentId ?? '无'}`,
      );

      await this.clearMenuCache();
      await this.clearMenuRelatedCache();

      this.logger.log(`移动菜单: ${menu.name} (ID: ${id}) 到父节点 ${targetParentId}`);

      return saved;
    });
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(menuIds: number[], isActive: boolean): Promise<void> {
    this.logger.debug(`批量更新菜单状态 menuIds=${JSON.stringify(menuIds)}, isActive=${isActive}`);
    await this.menuRepo
      .createQueryBuilder()
      .update()
      .set({ isActive })
      .whereInIds(menuIds)
      .execute();

    await this.clearMenuCache();
    await this.clearMenuRelatedCache();

    this.logger.log(`批量${isActive ? '启用' : '禁用'} ${menuIds.length} 个菜单`);
  }

  /**
   * 验证菜单路径唯一性
   */
  async validatePath(path: string, excludeId?: number): Promise<boolean> {
    this.logger.debug(`验证菜单路径唯一性 path=${path}, excludeId=${excludeId ?? '无'}`);
    const qb = this.menuRepo.createQueryBuilder('menu').where('menu.path = :path', { path });

    if (excludeId) {
      qb.andWhere('menu.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    this.logger.debug(`菜单路径唯一性检查完成 path=${path}, count=${count}`);
    return count === 0;
  }

  private async clearMenuRelatedCache(): Promise<void> {
    await Promise.all([
      this.cache.del(CACHE_KEYS.MENU_TREE()),
      this.cache.delByPattern(CACHE_KEYS.PATTERN_MENU_ALL()),
      this.cache.delByPattern(CACHE_KEYS.PATTERN_USER_MENUS()),
    ]);
  }

  private async clearMenuCache(menuId?: number): Promise<void> {
    if (menuId !== undefined) {
      await this.cache.del(`Menu:findOne:${menuId}`);
      return;
    }

    await this.cache.delByPattern('Menu:*');
  }
}
