import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { TreeUtil } from '~/common/utils/tree.util';
import { MenuEntity, MenuType } from '../entities/menu.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from '../dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 创建菜单
   */
  async create(dto: CreateMenuDto): Promise<MenuEntity> {
    this.logger.debug(
      `准备创建菜单 name=${dto.name}, path=${dto.path}, parentId=${dto.parentId ?? '无'}`,
    );

    // 如果指定了父菜单，检查父菜单是否存在
    if (dto.parentId) {
      const parent = await this.menuRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        this.logger.debug(`创建菜单失败，父菜单不存在 parentId=${dto.parentId}`);
        throw new NotFoundException(`父菜单 ID ${dto.parentId} 不存在`);
      }
      this.ensureDirectoryParent(parent);
      this.logger.debug(`创建菜单时找到父菜单 parentId=${dto.parentId}, name=${parent.name}`);
    }

    if (dto.path && !(await this.validatePath(dto.path))) {
      throw new BadRequestException('菜单路径已存在');
    }

    const entity = this.menuRepository.create(dto);
    this.logger.debug(`菜单实体构建完成，准备保存 name=${entity.name}`);
    const saved = await this.menuRepository.save(entity);
    this.logger.debug(`菜单保存成功 id=${saved.id}, name=${saved.name}`);

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
        const parent = await this.menuRepository.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          this.logger.debug(`更新菜单失败，父菜单不存在 id=${id}, parentId=${dto.parentId}`);
          throw new NotFoundException(`父菜单 ID ${dto.parentId} 不存在`);
        }
        this.ensureDirectoryParent(parent);

        // 检查是否会形成循环依赖
        const hasCircular = await this.checkCircularDependency(id, dto.parentId);
        if (hasCircular) {
          this.logger.debug(`更新菜单失败，检测到循环依赖 id=${id}, targetParent=${dto.parentId}`);
          throw new BadRequestException('不能将菜单移动到自己或其子菜单下,这会形成循环依赖');
        }
        this.logger.debug(`更新菜单父级校验通过 id=${id}, targetParent=${dto.parentId}`);
      }
    }

    if (
      dto.type === MenuType.MENU &&
      entity.type === MenuType.DIRECTORY &&
      entity.children &&
      entity.children.length > 0
    ) {
      throw new BadRequestException('存在子菜单的目录不能改为菜单');
    }

    if (dto.path && dto.path !== entity.path && !(await this.validatePath(dto.path, id))) {
      throw new BadRequestException('菜单路径已存在');
    }

    Object.assign(entity, dto);
    this.logger.debug(`菜单信息合并完成，准备保存 id=${id}`);
    const updated = await this.menuRepository.save(entity);
    this.logger.debug(`菜单更新保存成功 id=${updated.id}`);

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
    const children = await this.findChildrenByParentId(id);
    if (children.length > 0) {
      this.logger.debug(`删除菜单失败，存在 ${children.length} 个子菜单 id=${id}`);
      throw new BadRequestException('存在子菜单，无法删除');
    }

    const deleteResult = await this.menuRepository.softDelete(id);
    if (!deleteResult.affected) {
      throw new NotFoundException('菜单不存在');
    }
    this.logger.debug(`菜单软删除完成 id=${id}`);

    this.logger.log(`删除菜单: ${entity.name} (ID: ${id})`);
  }

  /**
   * 查询菜单详情
   */
  async findById(id: number): Promise<MenuEntity> {
    this.logger.debug(`查询菜单详情 id=${id}`);

    const entity = await this.menuRepository.findOne({
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
    const menus = await this.findMenusWithQuery(query);
    this.logger.debug(`查询菜单列表完成，返回数量=${menus.length}`);
    return menus;
  }

  /**
   * 获取菜单树
   */
  async getMenuTree(): Promise<any[]> {
    this.logger.debug('查询菜单树');
    const menus = await this.menuRepository.find({
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
      children:
        menu.children && menu.children.length > 0
          ? this.transformToRoutes(menu.children)
          : undefined,
    }));
  }

  /**
   * 获取用户菜单(基于角色)
   */
  async getUserMenusByRoles(userId: number, roleCodes: string[]): Promise<any[]> {
    this.logger.debug(
      `根据角色获取用户菜单 userId=${userId}, roleCodes=${JSON.stringify(roleCodes)}`,
    );

    if (!roleCodes.length) {
      return [];
    }

    let menus: MenuEntity[];

    // 1. 超级管理员特殊处理：自动拥有所有菜单
    if (roleCodes.includes('super_admin')) {
      this.logger.debug(`用户${userId}拥有super_admin角色，返回所有菜单`);
      menus = await this.menuRepository.find({
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

      const menuMap = new Map<number, MenuEntity>();

      // 3. 收集所有菜单
      for (const role of roles) {
        if (role.menus) {
          role.menus.forEach((menu) => {
            if (menu.isActive && menu.isVisible) {
              menuMap.set(menu.id, menu);
            }
          });
        }
        this.logger.debug(`角色 ${role.code} 菜单数量=${role.menus?.length || 0}`);
      }

      menus = await this.includeVisibleAncestors(Array.from(menuMap.values()));
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
    menuRepository: Pick<Repository<MenuEntity>, 'findOne'> = this.menuRepository,
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
  async moveMenu(
    id: number,
    targetParentId: number | null,
    placement?: { targetId?: number; position?: 'before' | 'after' | 'inside' },
  ): Promise<MenuEntity> {
    this.logger.debug(`准备移动菜单 id=${id}, targetParentId=${targetParentId}`);

    return await this.menuRepository.manager.transaction(async (manager) => {
      const transactionalRepo = manager.getRepository(MenuEntity);
      const menu = await transactionalRepo.findOne({
        where: { id },
      });

      if (!menu) {
        this.logger.debug(`移动菜单失败，菜单不存在 id=${id}`);
        throw new NotFoundException('菜单不存在');
      }

      if (placement?.targetId === id && placement.position && placement.position !== 'inside') {
        throw new BadRequestException('目标菜单不能是自己');
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
        this.ensureDirectoryParent(parent);

        const hasCircular = await this.checkCircularDependency(
          id,
          targetParentId,
          transactionalRepo,
        );
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

      if (placement?.targetId && placement.position && placement.position !== 'inside') {
        await this.reorderSiblingsAfterMove(transactionalRepo, saved, targetParentId, placement);
      }

      this.logger.debug(
        `菜单移动保存成功 id=${id}, oldParentId=${oldParentId ?? '无'}, newParentId=${saved.parentId ?? '无'}`,
      );

      this.logger.log(`移动菜单: ${menu.name} (ID: ${id}) 到父节点 ${targetParentId}`);

      return saved;
    });
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(menuIds: number[], isActive: boolean): Promise<void> {
    this.logger.debug(`批量更新菜单状态 menuIds=${JSON.stringify(menuIds)}, isActive=${isActive}`);
    const uniqueIds = Array.from(new Set(menuIds));
    if (uniqueIds.length === 0) {
      return;
    }

    const existingCount = await this.menuRepository.count({
      where: { id: In(uniqueIds) },
    });
    if (existingCount !== uniqueIds.length) {
      throw new BadRequestException('部分菜单不存在');
    }

    await this.menuRepository
      .createQueryBuilder()
      .update()
      .set({ isActive })
      .whereInIds(uniqueIds)
      .execute();

    this.logger.log(`批量${isActive ? '启用' : '禁用'} ${uniqueIds.length} 个菜单`);
  }

  /**
   * 验证菜单路径唯一性
   */
  async validatePath(path: string, excludeId?: number): Promise<boolean> {
    this.logger.debug(`验证菜单路径唯一性 path=${path}, excludeId=${excludeId ?? '无'}`);
    const qb = this.menuRepository.createQueryBuilder('menu').where('menu.path = :path', { path });

    if (excludeId) {
      qb.andWhere('menu.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    this.logger.debug(`菜单路径唯一性检查完成 path=${path}, count=${count}`);
    return count === 0;
  }

  private async findChildrenByParentId(parentId: number): Promise<MenuEntity[]> {
    return this.menuRepository.find({
      where: { parentId },
      order: { sort: 'ASC' },
    });
  }

  private ensureDirectoryParent(parent: MenuEntity): void {
    if (parent.type !== MenuType.DIRECTORY) {
      throw new BadRequestException('父菜单必须是目录类型');
    }
  }

  private async reorderSiblingsAfterMove(
    repository: Repository<MenuEntity>,
    movedMenu: MenuEntity,
    targetParentId: number | null,
    placement: { targetId?: number; position?: 'before' | 'after' | 'inside' },
  ): Promise<void> {
    const siblings = await repository.find({
      where: { parentId: targetParentId === null ? IsNull() : targetParentId },
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    const targetIndex = siblings.findIndex((item) => item.id === placement.targetId);
    if (targetIndex < 0) {
      throw new BadRequestException('目标菜单不存在于目标父级下');
    }

    const withoutMoved = siblings.filter((item) => item.id !== movedMenu.id);
    const targetIndexAfterRemove = withoutMoved.findIndex((item) => item.id === placement.targetId);
    const insertIndex =
      placement.position === 'before' ? targetIndexAfterRemove : targetIndexAfterRemove + 1;

    withoutMoved.splice(insertIndex, 0, movedMenu);
    withoutMoved.forEach((item, index) => {
      item.sort = (index + 1) * 10;
    });

    await repository.save(withoutMoved);
  }

  private async includeVisibleAncestors(menus: MenuEntity[]): Promise<MenuEntity[]> {
    const menuMap = new Map<number, MenuEntity>();
    for (const menu of menus) {
      menuMap.set(menu.id, menu);
    }

    for (const menu of menus) {
      let parentId = menu.parentId;
      while (parentId && !menuMap.has(parentId)) {
        const parent = await this.menuRepository.findOne({
          where: { id: parentId, isActive: true, isVisible: true },
        });
        if (!parent) {
          break;
        }
        menuMap.set(parent.id, parent);
        parentId = parent.parentId;
      }
    }

    return Array.from(menuMap.values());
  }

  private async findMenusWithQuery(query: QueryMenuDto): Promise<MenuEntity[]> {
    const qb = this.menuRepository.createQueryBuilder('menu');

    if (query.name) {
      qb.andWhere('menu.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.type) {
      qb.andWhere('menu.type = :type', { type: query.type });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('menu.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.isVisible !== undefined) {
      qb.andWhere('menu.isVisible = :isVisible', { isVisible: query.isVisible });
    }

    qb.orderBy('menu.parentId', 'ASC')
      .addOrderBy('menu.sort', 'ASC')
      .addOrderBy('menu.createdAt', 'ASC');

    return qb.getMany();
  }
}
