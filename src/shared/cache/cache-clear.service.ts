import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from './cache.service';
import { LoggerService } from '../logger/logger.service';
import { CACHE_KEYS } from '~/common/constants/cache.constants';
import { UserEntity } from '~/modules/user/entities/user.entity';

/**
 * 统一的缓存清理服务
 *
 * 职责：
 * 1. 定义清晰的缓存清理策略
 * 2. 确保关联缓存的完整清理
 * 3. 防止缓存不一致问题
 *
 * 设计原则：
 * - 级联清理：清理主体时自动清理所有关联缓存
 * - 批量清理：支持批量操作的缓存清理
 * - 日志记录：记录所有缓存清理操作
 */
@Injectable()
export class CacheClearService {
  constructor(
    private readonly cache: CacheService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CacheClearService.name);
  }

  // ==================== 用户相关缓存清理 ====================

  /**
   * 清理单个用户的所有缓存
   * @param userId 用户ID
   */
  async clearUserCache(userId: number): Promise<void> {
    this.logger.debug(`清理用户 ${userId} 的所有缓存`);

    await Promise.all([
      // 权限相关
      this.cache.del(CACHE_KEYS.USER_PERMISSIONS(userId)),

      // 菜单相关
      this.cache.del(CACHE_KEYS.USER_MENUS(userId)),

      // 用户详情
      this.cache.del(CACHE_KEYS.USER_DETAIL(userId)),

      // 部门相关 (已移除department功能)
      // this.cache.del(CACHE_KEYS.USER_DEPARTMENT(userId)),

      // 使用模式清理所有相关缓存
      this.cache.delByPattern(`user:*:${userId}`),
      this.cache.delByPattern(`menu:user:${userId}*`),
    ]);

    this.logger.log(`已清理用户 ${userId} 的所有缓存`);
  }

  /**
   * 批量清理多个用户的缓存
   * @param userIds 用户ID数组
   */
  async clearUsersCaches(userIds: number[]): Promise<void> {
    this.logger.debug(`批量清理 ${userIds.length} 个用户的缓存`);

    await Promise.all(userIds.map((userId) => this.clearUserCache(userId)));

    this.logger.log(`已批量清理 ${userIds.length} 个用户的缓存`);
  }

  /**
   * 清理所有用户的权限缓存
   * 场景：全局权限变更、系统维护等
   */
  async clearAllUserPermissionsCache(): Promise<void> {
    this.logger.warn('清理所有用户的权限缓存');

    await Promise.all([
      this.cache.delByPattern(CACHE_KEYS.PATTERN_USER_PERMISSIONS()),
      this.cache.delByPattern(CACHE_KEYS.PATTERN_USER_MENUS()),
    ]);

    this.logger.log('已清理所有用户的权限和菜单缓存');
  }

  // ==================== 角色相关缓存清理 ====================

  /**
   * 清理角色缓存（包括该角色下的所有用户）
   * @param roleId 角色ID
   */
  async clearRoleCache(roleId: number): Promise<void> {
    this.logger.debug(`清理角色 ${roleId} 的缓存`);

    // 1. 获取拥有该角色的所有用户
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .select('user.id')
      .getMany();

    const userIds = users.map((u) => u.id);

    // 2. 清理所有用户的缓存（因为用户的权限来自角色）
    if (userIds.length > 0) {
      await this.clearUsersCaches(userIds);
    }

    // 3. 清理角色本身的缓存
    await Promise.all([
      this.cache.del(CACHE_KEYS.ROLE_DETAIL(roleId)),
      this.cache.del(CACHE_KEYS.ROLE_PERMISSIONS(roleId)),
      this.cache.del(CACHE_KEYS.ROLE_MENUS(roleId)),
      this.cache.delByPattern(`role:*:${roleId}*`),
    ]);

    this.logger.log(`已清理角色 ${roleId} 的缓存（影响 ${userIds.length} 个用户）`);
  }

  /**
   * 批量清理多个角色的缓存
   * @param roleIds 角色ID数组
   */
  async clearRolesCaches(roleIds: number[]): Promise<void> {
    this.logger.debug(`批量清理 ${roleIds.length} 个角色的缓存`);

    await Promise.all(roleIds.map((roleId) => this.clearRoleCache(roleId)));

    this.logger.log(`已批量清理 ${roleIds.length} 个角色的缓存`);
  }

  /**
   * 清理所有角色相关缓存
   * 场景：角色系统重构、批量变更等
   */
  async clearAllRolesCache(): Promise<void> {
    this.logger.warn('清理所有角色缓存');

    await Promise.all([
      this.cache.delByPattern(CACHE_KEYS.PATTERN_ROLE_ALL()),
      // 同时清理所有用户缓存（因为用户权限来自角色）
      this.clearAllUserPermissionsCache(),
    ]);

    this.logger.log('已清理所有角色和用户缓存');
  }

  // ==================== 菜单相关缓存清理 ====================

  /**
   * 清理菜单缓存（包括所有用户和角色的菜单）
   * @param menuId 菜单ID（可选）
   */
  async clearMenuCache(menuId?: number): Promise<void> {
    if (menuId) {
      this.logger.debug(`清理菜单 ${menuId} 的缓存`);
      await this.cache.del(CACHE_KEYS.MENU_DETAIL(menuId));
    } else {
      this.logger.debug('清理所有菜单缓存');
    }

    await Promise.all([
      // 清理菜单树
      this.cache.del(CACHE_KEYS.MENU_TREE()),

      // 清理所有用户和角色的菜单缓存
      this.cache.delByPattern(CACHE_KEYS.PATTERN_MENU_ALL()),
      this.cache.delByPattern(CACHE_KEYS.PATTERN_USER_MENUS()),
    ]);

    this.logger.log(menuId ? `已清理菜单 ${menuId} 的缓存` : '已清理所有菜单缓存');
  }

  /**
   * 批量清理多个菜单的缓存
   * @param menuIds 菜单ID数组
   */
  async clearMenusCaches(menuIds: number[]): Promise<void> {
    this.logger.debug(`批量清理 ${menuIds.length} 个菜单的缓存`);

    // 菜单变更会影响所有用户，直接清理所有菜单缓存更高效
    await this.clearMenuCache();

    this.logger.log(`已批量清理 ${menuIds.length} 个菜单的缓存`);
  }

  // ==================== 权限相关缓存清理 ====================

  /**
   * 清理权限缓存（包括权限继承关系）
   * @param permissionId 权限ID（可选）
   */
  async clearPermissionCache(permissionId?: number): Promise<void> {
    if (permissionId) {
      this.logger.debug(`清理权限 ${permissionId} 的缓存`);

      await Promise.all([
        this.cache.del(CACHE_KEYS.PERMISSION_DETAIL(permissionId)),
        this.cache.del(CACHE_KEYS.PERMISSION_PARENTS(permissionId)),
        this.cache.delByPattern(`permission:*:${permissionId}*`),
      ]);
    } else {
      this.logger.debug('清理所有权限缓存');

      await this.cache.delByPattern(CACHE_KEYS.PATTERN_PERMISSION_ALL());
    }

    // 权限变更会影响所有用户，清理所有用户权限缓存
    await this.clearAllUserPermissionsCache();

    this.logger.log(permissionId ? `已清理权限 ${permissionId} 的缓存` : '已清理所有权限缓存');
  }

  /**
   * 批量清理多个权限的缓存
   * @param permissionIds 权限ID数组
   */
  async clearPermissionsCaches(permissionIds: number[]): Promise<void> {
    this.logger.debug(`批量清理 ${permissionIds.length} 个权限的缓存`);

    // 权限变更影响所有用户，直接清理所有相关缓存
    await this.clearPermissionCache();

    this.logger.log(`已批量清理 ${permissionIds.length} 个权限的缓存`);
  }

  // ==================== 部门相关缓存清理 ====================

  /**
   * 清理部门缓存（包括部门树和成员）
   * @param deptId 部门ID（可选）
   * @deprecated 已移除department功能
   */
  async clearDepartmentCache(deptId?: number): Promise<void> {
    // 已移除department功能
    this.logger.debug('Department功能已移除，跳过缓存清理');
    // if (deptId) {
    //   this.logger.debug(`清理部门 ${deptId} 的缓存`);
    //   await Promise.all([
    //     this.cache.del(CACHE_KEYS.DEPARTMENT_DETAIL(deptId)),
    //     this.cache.del(CACHE_KEYS.DEPARTMENT_MEMBERS(deptId)),
    //     this.cache.delByPattern(`department:*:${deptId}*`),
    //   ]);
    // } else {
    //   this.logger.debug('清理所有部门缓存');
    //   await Promise.all([
    //     this.cache.del(CACHE_KEYS.DEPARTMENT_TREE()),
    //     this.cache.delByPattern(CACHE_KEYS.PATTERN_DEPARTMENT_ALL()),
    //   ]);
    // }
    // this.logger.log(deptId ? `已清理部门 ${deptId} 的缓存` : '已清理所有部门缓存');
  }

  // ==================== 高级缓存清理 ====================

  /**
   * 清理用户角色关联变更后的缓存
   * @param userId 用户ID
   * @param roleIds 变更的角色ID数组
   */
  async clearUserRoleAssignmentCache(userId: number, roleIds: number[]): Promise<void> {
    this.logger.debug(`清理用户 ${userId} 的角色分配缓存（涉及角色: ${roleIds.join(', ')})`);

    // 清理用户的所有缓存
    await this.clearUserCache(userId);

    this.logger.log(`已清理用户 ${userId} 的角色分配缓存`);
  }

  /**
   * 清理角色权限关联变更后的缓存
   * @param roleId 角色ID
   * @param permissionIds 变更的权限ID数组
   */
  async clearRolePermissionAssignmentCache(roleId: number, permissionIds: number[]): Promise<void> {
    this.logger.debug(`清理角色 ${roleId} 的权限分配缓存（涉及权限: ${permissionIds.join(', ')})`);

    // 清理角色缓存（会级联清理所有拥有该角色的用户）
    await this.clearRoleCache(roleId);

    this.logger.log(`已清理角色 ${roleId} 的权限分配缓存`);
  }

  /**
   * 清理角色菜单关联变更后的缓存
   * @param roleId 角色ID
   * @param menuIds 变更的菜单ID数组
   */
  async clearRoleMenuAssignmentCache(roleId: number, menuIds: number[]): Promise<void> {
    this.logger.debug(`清理角色 ${roleId} 的菜单分配缓存（涉及菜单: ${menuIds.join(', ')})`);

    // 清理角色缓存（会级联清理所有拥有该角色的用户）
    await this.clearRoleCache(roleId);

    this.logger.log(`已清理角色 ${roleId} 的菜单分配缓存`);
  }

  // ==================== 紧急清理 ====================

  /**
   * 清理所有业务缓存（紧急情况使用）
   * 谨慎使用：会导致短时间内数据库压力激增
   */
  async clearAllBusinessCache(): Promise<void> {
    this.logger.warn('🚨 紧急清理所有业务缓存');

    await Promise.all([
      this.cache.delByPattern('user:*'),
      this.cache.delByPattern('role:*'),
      this.cache.delByPattern('permission:*'),
      this.cache.delByPattern('menu:*'),
      // this.cache.delByPattern('department:*'), // 已移除department功能
    ]);

    this.logger.warn('已清理所有业务缓存，请监控数据库负载');
  }
}
