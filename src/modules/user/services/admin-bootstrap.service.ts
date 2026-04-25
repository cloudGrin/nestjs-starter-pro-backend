import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { UserStatus } from '~/common/enums/user.enum';
import { LoggerService } from '~/shared/logger/logger.service';
import { RoleCategory, RoleEntity } from '~/modules/role/entities/role.entity';
import { MenuEntity, MenuType } from '~/modules/menu/entities/menu.entity';
import { UserEntity } from '../entities/user.entity';

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
    private readonly logger: LoggerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.userRepository.count({ withDeleted: true });

    if (userCount > 0) {
      return;
    }

    const role = await this.ensureSuperAdminRole();
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
