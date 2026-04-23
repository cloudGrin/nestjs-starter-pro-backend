/**
 * Mock数据工厂
 *
 * 使用Faker.js生成测试数据
 */

import { faker } from '@faker-js/faker';

// 设置中文locale
faker.setDefaultRefDate('2024-01-01');
import { UserEntity } from '~/modules/user/entities/user.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';
import { UserStatus } from '~/common/enums/user.enum';
import { UserGender } from '~/common/enums/user.enum';

/**
 * 用户Mock数据工厂
 */
export class UserMockFactory {
  /**
   * 创建Mock用户
   */
  static create(overrides?: Partial<UserEntity>): UserEntity {
    const user = new UserEntity();

    user.id = faker.number.int({ min: 1, max: 10000 });
    user.username = faker.internet.userName();
    user.email = faker.internet.email();
    user.nickname = faker.person.fullName();
    user.phone = `13${faker.number.int({ min: 100000000, max: 999999999 })}`;
    user.password = '$2a$10$abcdefghijklmnopqrstuv'; // bcrypt hash for 'password123'
    user.avatar = faker.image.avatar();
    user.gender = faker.helpers.arrayElement([
      UserGender.MALE,
      UserGender.FEMALE,
      UserGender.UNKNOWN,
    ]);
    user.status = UserStatus.ACTIVE;
    user.loginAttempts = 0;
    user.lastLoginAt = faker.date.recent();
    user.lastLoginIp = faker.internet.ip();
    user.createdAt = faker.date.past();
    user.updatedAt = faker.date.recent();

    // 应用覆盖
    Object.assign(user, overrides);

    return user;
  }

  /**
   * 创建多个Mock用户
   */
  static createMany(count: number, overrides?: Partial<UserEntity>): UserEntity[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * 创建管理员用户
   */
  static createAdmin(overrides?: Partial<UserEntity>): UserEntity {
    return this.create({
      username: 'admin',
      email: 'admin@example.com',
      ...overrides,
    });
  }

  /**
   * 创建被锁定的用户
   */
  static createLocked(overrides?: Partial<UserEntity>): UserEntity {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + 30);

    return this.create({
      loginAttempts: 5,
      lockedUntil,
      ...overrides,
    });
  }

  /**
   * 创建被禁用的用户
   */
  static createDisabled(overrides?: Partial<UserEntity>): UserEntity {
    return this.create({
      status: UserStatus.DISABLED,
      ...overrides,
    });
  }
}

/**
 * 角色Mock数据工厂
 */
export class RoleMockFactory {
  /**
   * 创建Mock角色
   */
  static create(overrides?: Partial<RoleEntity>): RoleEntity {
    const role = new RoleEntity();

    role.id = faker.number.int({ min: 1, max: 1000 });
    role.code = faker.helpers.arrayElement(['admin', 'user', 'manager', 'operator']);
    role.name = faker.helpers.arrayElement(['管理员', '普通用户', '经理', '操作员']);
    role.description = faker.lorem.sentence();
    role.isSystem = false;
    role.sort = faker.number.int({ min: 0, max: 100 });
    role.createdAt = faker.date.past();
    role.updatedAt = faker.date.recent();

    // 应用覆盖
    Object.assign(role, overrides);

    return role;
  }

  /**
   * 创建多个Mock角色
   */
  static createMany(count: number, overrides?: Partial<RoleEntity>): RoleEntity[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * 创建系统角色
   */
  static createSystem(overrides?: Partial<RoleEntity>): RoleEntity {
    return this.create({
      code: 'admin',
      name: '系统管理员',
      isSystem: true,
      ...overrides,
    });
  }
}

/**
 * 权限Mock数据工厂
 */
export class PermissionMockFactory {
  /**
   * 创建Mock权限
   */
  static create(overrides?: Partial<PermissionEntity>): PermissionEntity {
    const permission = new PermissionEntity();

    permission.id = faker.number.int({ min: 1, max: 1000 });
    permission.code = `${faker.helpers.arrayElement(['user', 'role', 'menu', 'system'])}:${faker.helpers.arrayElement(['create', 'read', 'update', 'delete'])}`;
    permission.name = faker.lorem.words(3);
    permission.description = faker.lorem.sentence();
    permission.module = faker.helpers.arrayElement([
      '用户管理',
      '角色管理',
      '菜单管理',
      '系统管理',
    ]);
    permission.createdAt = faker.date.past();
    permission.updatedAt = faker.date.recent();

    // 应用覆盖
    Object.assign(permission, overrides);

    return permission;
  }

  /**
   * 创建多个Mock权限
   */
  static createMany(count: number, overrides?: Partial<PermissionEntity>): PermissionEntity[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * JWT Payload Mock数据工厂
 */
export class JwtPayloadMockFactory {
  static create(overrides?: any): any {
    return {
      sub: faker.number.int({ min: 1, max: 10000 }),
      username: faker.internet.userName(),
      email: faker.internet.email(),
      type: 'access',
      sessionId: faker.string.uuid(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    };
  }
}

/**
 * 登录DTO Mock数据工厂
 */
export class LoginDtoMockFactory {
  static create(overrides?: any): any {
    return {
      account: faker.internet.userName(),
      password: 'password123',
      ...overrides,
    };
  }
}
