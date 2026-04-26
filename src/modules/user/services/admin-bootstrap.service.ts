import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { UserStatus } from '~/common/enums/user.enum';
import { LoggerService } from '~/shared/logger/logger.service';
import { RoleCategory, RoleEntity } from '~/modules/role/entities/role.entity';
import { MenuEntity, MenuType } from '~/modules/menu/entities/menu.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';
import { UserEntity } from '../entities/user.entity';

const DEFAULT_SYSTEM_PERMISSIONS = [
  { code: 'user:create', name: '创建用户', module: 'user', sort: 10 },
  { code: 'user:read', name: '查看用户', module: 'user', sort: 20 },
  { code: 'user:update', name: '更新用户', module: 'user', sort: 30 },
  { code: 'user:delete', name: '删除用户', module: 'user', sort: 40 },
  { code: 'user:password:reset', name: '重置用户密码', module: 'user', sort: 50 },
  { code: 'role:create', name: '创建角色', module: 'role', sort: 10 },
  { code: 'role:read', name: '查看角色', module: 'role', sort: 20 },
  { code: 'role:update', name: '更新角色', module: 'role', sort: 30 },
  { code: 'role:delete', name: '删除角色', module: 'role', sort: 40 },
  { code: 'role:assign', name: '分配用户角色', module: 'role', sort: 50 },
  { code: 'role:permission:assign', name: '分配角色权限', module: 'role', sort: 60 },
  { code: 'role:menu:assign', name: '分配角色菜单', module: 'role', sort: 70 },
  { code: 'role:menu:read', name: '查看角色菜单', module: 'role', sort: 80 },
  { code: 'role:menu:revoke', name: '移除角色菜单', module: 'role', sort: 90 },
  { code: 'permission:create', name: '创建权限', module: 'permission', sort: 10 },
  { code: 'permission:read', name: '查看权限', module: 'permission', sort: 20 },
  { code: 'permission:update', name: '更新权限', module: 'permission', sort: 30 },
  { code: 'permission:delete', name: '删除权限', module: 'permission', sort: 40 },
  { code: 'menu:create', name: '创建菜单', module: 'menu', sort: 10 },
  { code: 'menu:read', name: '查看菜单', module: 'menu', sort: 20 },
  { code: 'menu:update', name: '更新菜单', module: 'menu', sort: 30 },
  { code: 'menu:delete', name: '删除菜单', module: 'menu', sort: 40 },
  { code: 'file:upload', name: '上传文件', module: 'file', sort: 10 },
  { code: 'file:read', name: '查看文件', module: 'file', sort: 20 },
  { code: 'file:download', name: '下载文件', module: 'file', sort: 30 },
  { code: 'file:delete', name: '删除文件', module: 'file', sort: 40 },
  { code: 'notification:create', name: '创建通知', module: 'notification', sort: 10 },
  { code: 'notification:read', name: '查看通知', module: 'notification', sort: 20 },
  { code: 'api-app:create', name: '创建 API 应用', module: 'api-auth', sort: 10 },
  { code: 'api-app:read', name: '查看 API 应用', module: 'api-auth', sort: 20 },
  { code: 'api-app:update', name: '更新 API 应用', module: 'api-auth', sort: 30 },
  { code: 'api-app:delete', name: '删除 API 应用', module: 'api-auth', sort: 40 },
  { code: 'api-app:key:create', name: '创建 API 密钥', module: 'api-auth', sort: 50 },
  { code: 'api-app:key:read', name: '查看 API 密钥', module: 'api-auth', sort: 60 },
  { code: 'api-app:key:delete', name: '删除 API 密钥', module: 'api-auth', sort: 70 },
] as const;

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private static readonly ADMIN_USERNAME = 'admin';
  private static readonly ADMIN_EMAIL = 'admin@local.home';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(MenuEntity)
    private readonly menuRepository: Repository<MenuEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    private readonly logger: LoggerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.userRepository.count({ withDeleted: true });

    if (userCount > 0) {
      return;
    }

    const role = await this.ensureSuperAdminRole();
    await this.ensureDefaultPermissions();
    await this.ensureDefaultMenus();
    const password = this.generatePassword();
    const admin = this.userRepository.create({
      username: AdminBootstrapService.ADMIN_USERNAME,
      email: AdminBootstrapService.ADMIN_EMAIL,
      password,
      realName: '系统管理员',
      status: UserStatus.ACTIVE,
      roles: [role],
    });

    await this.userRepository.save(admin);
    this.logInitialAdmin(password);
  }

  private async ensureSuperAdminRole(): Promise<RoleEntity> {
    const existing = await this.roleRepository.findOne({
      where: { code: 'super_admin' },
    });

    if (existing) {
      return existing;
    }

    const role = this.roleRepository.create({
      code: 'super_admin',
      name: '超级管理员',
      description: '系统初始化创建的超级管理员角色',
      category: RoleCategory.SYSTEM,
      sort: 0,
      isActive: true,
      isSystem: true,
    });

    return this.roleRepository.save(role);
  }

  private async ensureDefaultPermissions(): Promise<void> {
    const existingPermissions = await this.permissionRepository.find({
      select: ['code'],
    });
    const existingCodes = new Set(existingPermissions.map((permission) => permission.code));
    const permissionsToCreate = DEFAULT_SYSTEM_PERMISSIONS.filter(
      (permission) => !existingCodes.has(permission.code),
    );

    if (permissionsToCreate.length === 0) {
      return;
    }

    await this.permissionRepository.save(
      this.permissionRepository.create(
        permissionsToCreate.map((permission) => ({
          ...permission,
          isActive: true,
          isSystem: true,
        })),
      ),
    );

    this.logger.log(`Initialized ${permissionsToCreate.length} system permissions`);
  }

  private async ensureDefaultMenus(): Promise<void> {
    const menuCount = await this.menuRepository.count();
    if (menuCount > 0) {
      return;
    }

    const systemMenu = this.menuRepository.create({
      name: '系统管理',
      path: '/system',
      type: MenuType.DIRECTORY,
      icon: 'setting',
      sort: 10,
      isVisible: true,
      isActive: true,
      meta: { title: '系统管理', icon: 'setting' },
    });
    const savedSystemMenu = await this.menuRepository.save(systemMenu);

    const menus = this.menuRepository.create([
      {
        name: '用户管理',
        path: '/system/users',
        type: MenuType.MENU,
        icon: 'user',
        component: 'system/users',
        parentId: savedSystemMenu.id,
        sort: 20,
        isVisible: true,
        isActive: true,
        meta: { title: '用户管理', icon: 'user' },
      },
      {
        name: '角色管理',
        path: '/system/roles',
        type: MenuType.MENU,
        icon: 'team',
        component: 'system/roles',
        parentId: savedSystemMenu.id,
        sort: 30,
        isVisible: true,
        isActive: true,
        meta: { title: '角色管理', icon: 'team' },
      },
      {
        name: '菜单管理',
        path: '/system/menus',
        type: MenuType.MENU,
        icon: 'menu',
        component: 'system/menus',
        parentId: savedSystemMenu.id,
        sort: 40,
        isVisible: true,
        isActive: true,
        meta: { title: '菜单管理', icon: 'menu' },
      },
      {
        name: '权限管理',
        path: '/system/permissions',
        type: MenuType.MENU,
        icon: 'safety',
        component: 'system/permissions',
        parentId: savedSystemMenu.id,
        sort: 50,
        isVisible: true,
        isActive: true,
        meta: { title: '权限管理', icon: 'safety' },
      },
      {
        name: 'API应用',
        path: '/system/api-apps',
        type: MenuType.MENU,
        icon: 'api',
        component: 'system/api-apps',
        parentId: savedSystemMenu.id,
        sort: 60,
        isVisible: true,
        isActive: true,
        meta: { title: 'API应用', icon: 'api' },
      },
      {
        name: '文件管理',
        path: '/system/files',
        type: MenuType.MENU,
        icon: 'folder',
        component: 'system/files',
        parentId: savedSystemMenu.id,
        sort: 70,
        isVisible: true,
        isActive: true,
        meta: { title: '文件管理', icon: 'folder' },
      },
      {
        name: '通知中心',
        path: '/system/notifications',
        type: MenuType.MENU,
        icon: 'notification',
        component: 'system/notifications',
        parentId: savedSystemMenu.id,
        sort: 80,
        isVisible: true,
        isActive: true,
        meta: { title: '通知中心', icon: 'notification' },
      },
    ]);

    await this.menuRepository.save(menus);
  }

  private generatePassword(length = 20): string {
    const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789'];
    const specials = '@$!%*?&_-';
    const allChars = groups.join('') + specials;
    const chars = [...groups.map((group) => this.pick(group))];

    while (chars.length < length) {
      chars.push(this.pick(allChars));
    }

    return this.shuffle(chars).join('');
  }

  private pick(chars: string): string {
    return chars[randomInt(chars.length)];
  }

  private shuffle(chars: string[]): string[] {
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars;
  }

  private logInitialAdmin(password: string): void {
    this.logger.warn('Initial admin account created');
    this.logger.warn(`username: ${AdminBootstrapService.ADMIN_USERNAME}`);
    this.logger.warn(`password: ${password}`);
    this.logger.warn('This password is shown only once. Change it after login.');
  }
}
