import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { PaginationResult } from '~/core/base/base.repository';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';
import { RoleRepository } from '../repositories/role.repository';
import { CreateRoleDto } from '../dto/create-role.dto';

@Injectable()
export class RoleService extends BaseService<RoleEntity> {
  protected repository: RoleRepository;

  constructor(
    private readonly roleRepository: RoleRepository,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    logger: LoggerService,
    cache: CacheService,
  ) {
    super();
    this.repository = roleRepository;
    this.logger = logger;
    this.cache = cache;
    this.logger.setContext(RoleService.name);
  }

  /**
   * 创建角色
   */
  async createRole(dto: CreateRoleDto): Promise<RoleEntity> {
    this.logger.debug(
      `准备创建角色，code=${dto.code}, name=${dto.name}, permissionIds=${JSON.stringify(dto.permissionIds || [])}`,
    );

    // 检查角色编码是否存在
    if (await this.roleRepository.isCodeExist(dto.code)) {
      this.logger.debug(`创建角色失败，角色编码已存在: ${dto.code}`);
      throw new ConflictException('角色编码已存在');
    }

    // 获取权限
    let permissions: PermissionEntity[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionRepository.find({
        where: { id: In(dto.permissionIds), isActive: true },
      });

      this.logger.debug(
        `创建角色查询权限数量: 请求=${dto.permissionIds.length}, 实际=${permissions.length}`,
      );

      if (permissions.length !== dto.permissionIds.length) {
        this.logger.debug(
          `创建角色失败，部分权限不存在或禁用: ${JSON.stringify(dto.permissionIds)}`,
        );
        throw new BadRequestException('部分权限不存在或已禁用');
      }
    }

    // 创建角色
    const role = this.roleRepository.create({
      ...dto,
      permissions,
      isSystem: false,
    });

    this.logger.debug(
      `创建角色实体准备保存 code=${role.code}, permissionCount=${role.permissions?.length || 0}`,
    );

    const savedRole = await this.roleRepository.save(role);
    this.logger.debug(`角色保存成功 id=${savedRole.id}, code=${savedRole.code}`);

    // 清除缓存
    await this.clearCache();
    this.logger.debug('创建角色后清理缓存完成');

    this.logger.log(`Created role: ${savedRole.name} (${savedRole.code})`);

    return savedRole;
  }

  /**
   * 更新角色
   */
  async updateRole(id: number, dto: Partial<CreateRoleDto>): Promise<RoleEntity> {
    this.logger.debug(`准备更新角色 id=${id}, payload=${JSON.stringify(dto)}`);

    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      this.logger.debug(`更新角色失败，未找到角色 id=${id}`);
      throw new NotFoundException('角色不存在');
    }

    // 系统角色不能修改
    if (role.isSystem) {
      this.logger.debug(`更新角色失败，系统角色禁止修改 id=${id}`);
      throw new BadRequestException('系统角色不能修改');
    }

    // 检查角色编码是否存在
    if (dto.code && dto.code !== role.code) {
      if (await this.roleRepository.isCodeExist(dto.code, id)) {
        this.logger.debug(`更新角色失败，新编码重复 code=${dto.code}, id=${id}`);
        throw new ConflictException('角色编码已存在');
      }
    }

    // 更新权限
    if (dto.permissionIds !== undefined) {
      this.logger.debug(
        `更新角色权限，roleId=${id}, permissionIds=${JSON.stringify(dto.permissionIds)}`,
      );

      const permissions =
        dto.permissionIds.length > 0
          ? await this.permissionRepository.find({
              where: { id: In(dto.permissionIds), isActive: true },
            })
          : [];

      this.logger.debug(
        `角色权限查询完成，roleId=${id}, 请求数量=${dto.permissionIds.length}, 查询数量=${permissions.length}`,
      );

      if (dto.permissionIds.length > 0 && permissions.length !== dto.permissionIds.length) {
        this.logger.debug(`更新角色失败，权限校验不通过 roleId=${id}`);
        throw new BadRequestException('部分权限不存在或已禁用');
      }

      role.permissions = permissions;
    }

    // 更新角色信息
    Object.assign(role, dto);
    this.logger.debug(`角色信息合并完成，准备保存 roleId=${id}`);
    const updatedRole = await this.roleRepository.save(role);
    this.logger.debug(`角色更新保存成功 roleId=${updatedRole.id}`);

    // 清除相关缓存（包括拥有该角色的用户权限缓存）
    await this.clearCache();
    await this.clearUserPermissionCache();
    this.logger.debug(`更新角色后清理缓存完成 roleId=${updatedRole.id}`);

    this.logger.log(`Updated role: ${updatedRole.name} (ID: ${updatedRole.id})`);

    return updatedRole;
  }

  /**
   * 删除角色
   */
  async deleteRole(id: number): Promise<void> {
    this.logger.debug(`准备删除角色 id=${id}`);

    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!role) {
      this.logger.debug(`删除角色失败，未找到角色 id=${id}`);
      throw new NotFoundException('角色不存在');
    }

    // 系统角色不能删除
    if (role.isSystem) {
      this.logger.debug(`删除角色失败，系统角色禁止删除 id=${id}`);
      throw new BadRequestException('系统角色不能删除');
    }

    // 检查是否有用户使用该角色
    if (role.users && role.users.length > 0) {
      this.logger.debug(`删除角色失败，存在 ${role.users.length} 个用户正在使用 roleId=${id}`);
      throw new BadRequestException('该角色正在被使用，不能删除');
    }

    await this.roleRepository.softDelete(id);

    // 清除缓存
    await this.clearCache();
    this.logger.debug(`删除角色后清理缓存完成 roleId=${id}`);

    this.logger.log(`Deleted role: ${role.name} (ID: ${id})`);
  }

  /**
   * 获取角色详情
   */
  async findRoleById(id: number): Promise<RoleEntity> {
    this.logger.debug(`查询角色详情 id=${id}`);

    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      this.logger.debug(`查询角色详情失败，未找到角色 id=${id}`);
      throw new NotFoundException('角色不存在');
    }

    this.logger.debug(`查询角色详情完成 id=${id}, 权限数量=${role.permissions?.length || 0}`);

    return role;
  }

  /**
   * 根据编码获取角色
   */
  async findRoleByCode(code: string): Promise<RoleEntity | null> {
    this.logger.debug(`根据编码查询角色 code=${code}`);
    return this.roleRepository.findByCode(code);
  }

  /**
   * 查询角色列表
   */
  async findRoles(query: {
    name?: string;
    code?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginationResult<RoleEntity>> {
    this.logger.debug(`查询角色列表，过滤条件=${JSON.stringify(query)}`);

    const [items, totalItems] = await this.roleRepository.findWithQuery(query);
    this.logger.debug(`角色列表查询完成，返回数量=${items.length}, 总量=${totalItems}`);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: query.limit || 10,
        totalPages: Math.ceil(totalItems / (query.limit || 10)),
        currentPage: query.page || 1,
      },
    };
  }

  /**
   * 获取所有活跃角色
   */
  async findActiveRoles(): Promise<RoleEntity[]> {
    this.logger.debug('查询所有活跃角色');
    const roles = await this.roleRepository.findActiveRoles();
    this.logger.debug(`查询活跃角色完成，数量=${roles.length}`);
    return roles;
  }

  /**
   * 分配权限
   */
  async assignPermissions(roleId: number, permissionIds: number[]): Promise<RoleEntity> {
    this.logger.debug(
      `准备分配权限 roleId=${roleId}, permissionIds=${JSON.stringify(permissionIds)}`,
    );

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      this.logger.debug(`分配权限失败，未找到角色 roleId=${roleId}`);
      throw new NotFoundException('角色不存在');
    }

    if (role.isSystem) {
      this.logger.debug(`分配权限失败，系统角色禁止修改权限 roleId=${roleId}`);
      throw new BadRequestException('系统角色权限不能修改');
    }

    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds), isActive: true },
    });

    this.logger.debug(
      `角色权限查询完成 roleId=${roleId}, 请求数量=${permissionIds.length}, 查询数量=${permissions.length}`,
    );

    if (permissions.length !== permissionIds.length) {
      this.logger.debug(`分配权限失败，部分权限不存在或禁用 roleId=${roleId}`);
      throw new BadRequestException('部分权限不存在或已禁用');
    }

    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);
    this.logger.debug(`角色权限保存成功 roleId=${roleId}`);

    // 清除用户权限缓存
    await this.clearUserPermissionCache();
    this.logger.debug(`分配权限后清理用户权限缓存 roleId=${roleId}`);

    this.logger.log(`Assigned ${permissions.length} permissions to role ${roleId}`);

    return updatedRole;
  }

  /**
   * 清除用户权限缓存
   */
  private async clearUserPermissionCache(): Promise<void> {
    // 清除所有用户的权限缓存
    await this.cache.delByPattern('user:permissions:*');
    this.logger.debug('已清除所有用户权限缓存');
  }

  // ==================== 🆕 RBAC 2.0 新增方法 ====================

  /**
   * 获取角色的有效权限（简化版：仅直接分配的权限）
   */
  async getEffectivePermissions(roleId: number): Promise<string[]> {
    this.logger.debug(`计算角色有效权限 roleId=${roleId}`);

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role) {
      this.logger.debug(`计算有效权限失败，未找到角色 roleId=${roleId}`);
      throw new NotFoundException('角色不存在');
    }

    const permissionCodes = new Set<string>();

    // 从直接分配的权限获取
    if (role.permissions) {
      role.permissions.forEach((p) => {
        if (p.isActive) {
          permissionCodes.add(p.code);
        }
      });
    }
    this.logger.debug(`角色直接权限统计 roleId=${roleId}, 数量=${role.permissions?.length || 0}`);

    const result = Array.from(permissionCodes);
    this.logger.debug(`角色有效权限计算完成 roleId=${roleId}, 总数=${result.length}`);

    return result;
  }

  /**
   * 检查角色互斥冲突（简化版：轻量级系统无互斥角色概念）
   */
  async checkExclusiveConflict(
    userId: number,
    newRoleIds: number[],
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{ role1: string; role2: string }>;
  }> {
    this.logger.debug(`检测角色互斥冲突 userId=${userId}, roleIds=${JSON.stringify(newRoleIds)}`);

    // 轻量级系统简化：不存在互斥角色，始终返回无冲突
    this.logger.debug('轻量级系统无互斥角色限制，跳过冲突检查');

    return {
      hasConflict: false,
      conflicts: [],
    };
  }

  // ==================== 🆕 菜单管理方法 ====================

  /**
   * 分配菜单给角色
   */
  async assignMenus(roleId: number, menuIds: number[]): Promise<RoleEntity> {
    this.logger.debug(`准备分配菜单 roleId=${roleId}, menuIds=${JSON.stringify(menuIds)}`);

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['menus'],
    });

    if (!role) {
      this.logger.debug(`分配菜单失败，未找到角色 roleId=${roleId}`);
      throw new NotFoundException('角色不存在');
    }

    if (role.isSystem) {
      this.logger.debug(`分配菜单失败，系统角色禁止修改菜单 roleId=${roleId}`);
      throw new BadRequestException('系统角色菜单不能修改');
    }

    const menus = await this.menuRepository.find({
      where: { id: In(menuIds), isActive: true },
    });

    this.logger.debug(
      `角色菜单查询完成 roleId=${roleId}, 请求数量=${menuIds.length}, 查询数量=${menus.length}`,
    );

    if (menus.length !== menuIds.length) {
      this.logger.debug(`分配菜单失败，部分菜单不存在或禁用 roleId=${roleId}`);
      throw new BadRequestException('部分菜单不存在或已禁用');
    }

    role.menus = menus;
    const updatedRole = await this.roleRepository.save(role);
    this.logger.debug(`角色菜单保存成功 roleId=${roleId}`);

    // 清除缓存
    await this.clearCache();
    await this.clearUserMenuCache();
    this.logger.debug(`分配菜单后清理缓存完成 roleId=${roleId}`);

    this.logger.log(`分配 ${menus.length} 个菜单给角色 ${roleId}`);

    return updatedRole;
  }

  /**
   * 获取角色的菜单列表
   */
  async getRoleMenus(roleId: number): Promise<MenuEntity[]> {
    this.logger.debug(`查询角色菜单列表 roleId=${roleId}`);

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['menus'],
    });

    if (!role) {
      this.logger.debug(`查询角色菜单失败，未找到角色 roleId=${roleId}`);
      throw new NotFoundException('角色不存在');
    }

    this.logger.debug(`查询角色菜单完成 roleId=${roleId}, 菜单数量=${role.menus?.length || 0}`);

    return role.menus || [];
  }

  /**
   * 移除角色的菜单
   */
  async revokeMenus(roleId: number, menuIds: number[]): Promise<RoleEntity> {
    this.logger.debug(`准备移除角色菜单 roleId=${roleId}, menuIds=${JSON.stringify(menuIds)}`);

    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['menus'],
    });

    if (!role) {
      this.logger.debug(`移除菜单失败，未找到角色 roleId=${roleId}`);
      throw new NotFoundException('角色不存在');
    }

    if (role.isSystem) {
      this.logger.debug(`移除菜单失败，系统角色禁止修改菜单 roleId=${roleId}`);
      throw new BadRequestException('系统角色菜单不能修改');
    }

    // 过滤掉要移除的菜单
    role.menus = (role.menus || []).filter((menu) => !menuIds.includes(menu.id));

    const updatedRole = await this.roleRepository.save(role);
    this.logger.debug(`角色菜单移除后保存成功 roleId=${roleId}`);

    // 清除缓存
    await this.clearCache();
    await this.clearUserMenuCache();
    this.logger.debug(`移除菜单后清理缓存完成 roleId=${roleId}`);

    this.logger.log(`移除角色 ${roleId} 的 ${menuIds.length} 个菜单`);

    return updatedRole;
  }

  /**
   * 清除用户菜单缓存
   */
  private async clearUserMenuCache(): Promise<void> {
    await this.cache.delByPattern('menu:user:*');
    await this.cache.delByPattern('menu:role:*');
    this.logger.debug('已清除用户/角色菜单缓存');
  }
}
