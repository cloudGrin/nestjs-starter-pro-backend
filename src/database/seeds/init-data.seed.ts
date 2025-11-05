import { DataSource } from 'typeorm';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { PermissionEntity, PermissionType } from '~/modules/permission/entities/permission.entity';
import { UserStatus } from '~/common/enums/user.enum';
import { CryptoUtil } from '~/common/utils/crypto.util';

export class InitDataSeed {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(UserEntity);
    const roleRepository = dataSource.getRepository(RoleEntity);
    const permissionRepository = dataSource.getRepository(PermissionEntity);

    // 创建默认权限
    const permissions = await this.createDefaultPermissions(permissionRepository);

    // 创建默认角色
    const roles = await this.createDefaultRoles(roleRepository, permissions);

    // 创建默认用户
    await this.createDefaultUsers(userRepository, roles);

    console.log('✅ Seed data initialized successfully');
  }

  private async createDefaultPermissions(repository: any): Promise<PermissionEntity[]> {
    const permissions = [
      // 系统管理
      {
        code: 'system',
        name: '系统管理',
        type: PermissionType.FEATURE,
        path: '/system',
        icon: 'setting',
        sort: 1,
      },
      {
        code: 'system:user',
        name: '用户管理',
        type: PermissionType.FEATURE,
        path: '/system/user',
        component: 'system/user/index',
        sort: 1,
      },
      {
        code: 'system:user:create',
        name: '创建用户',
        type: PermissionType.API,
        apiPath: '/api/v1/users',
        method: 'POST',
        sort: 1,
      },
      {
        code: 'system:user:update',
        name: '更新用户',
        type: PermissionType.API,
        apiPath: '/api/v1/users/:id',
        method: 'PUT',
        sort: 2,
      },
      {
        code: 'system:user:delete',
        name: '删除用户',
        type: PermissionType.API,
        apiPath: '/api/v1/users/:id',
        method: 'DELETE',
        sort: 3,
      },
      {
        code: 'system:role',
        name: '角色管理',
        type: PermissionType.FEATURE,
        path: '/system/role',
        component: 'system/role/index',
        sort: 2,
      },
      {
        code: 'system:role:create',
        name: '创建角色',
        type: PermissionType.API,
        apiPath: '/api/v1/roles',
        method: 'POST',
        sort: 1,
      },
      {
        code: 'system:role:update',
        name: '更新角色',
        type: PermissionType.API,
        apiPath: '/api/v1/roles/:id',
        method: 'PUT',
        sort: 2,
      },
      {
        code: 'system:role:delete',
        name: '删除角色',
        type: PermissionType.API,
        apiPath: '/api/v1/roles/:id',
        method: 'DELETE',
        sort: 3,
      },
      {
        code: 'system:permission',
        name: '权限管理',
        type: PermissionType.FEATURE,
        path: '/system/permission',
        component: 'system/permission/index',
        sort: 3,
      },
      // 监控管理
      {
        code: 'monitor',
        name: '监控管理',
        type: PermissionType.FEATURE,
        path: '/monitor',
        icon: 'monitor',
        sort: 2,
      },
      {
        code: 'monitor:online',
        name: '在线用户',
        type: PermissionType.FEATURE,
        path: '/monitor/online',
        component: 'monitor/online/index',
        sort: 1,
      },
      {
        code: 'monitor:log',
        name: '操作日志',
        type: PermissionType.FEATURE,
        path: '/monitor/log',
        component: 'monitor/log/index',
        sort: 2,
      },
    ];

    const savedPermissions: PermissionEntity[] = [];
    for (const perm of permissions) {
      const existing = await repository.findOne({ where: { code: perm.code } });
      if (!existing) {
        const permission = repository.create(perm);
        const saved = await repository.save(permission);
        savedPermissions.push(saved);
      } else {
        savedPermissions.push(existing);
      }
    }

    // 建立权限父子关系
    const systemPerm = savedPermissions.find((p) => p.code === 'system');
    // 权限系统已简化，不再支持父子关系
    // 所有权限都是扁平结构

    console.log(`✅ Created ${savedPermissions.length} permissions`);
    return savedPermissions;
  }

  private async createDefaultRoles(
    repository: any,
    permissions: PermissionEntity[],
  ): Promise<RoleEntity[]> {
    const roles = [
      {
        code: 'super_admin',
        name: '超级管理员',
        description: '系统超级管理员，拥有所有权限',
        isSystem: true,
        permissions: permissions, // 所有权限
      },
      {
        code: 'admin',
        name: '管理员',
        description: '系统管理员，拥有大部分权限',
        isSystem: true,
        permissions: permissions.filter((p) => !p.code.includes('permission')), // 除权限管理外的所有权限
      },
      {
        code: 'user',
        name: '普通用户',
        description: '普通用户角色',
        isSystem: false,
        permissions: permissions.filter((p) => p.code.startsWith('monitor')), // 只有监控权限
      },
    ];

    const savedRoles: RoleEntity[] = [];
    for (const roleData of roles) {
      const existing = await repository.findOne({ where: { code: roleData.code } });
      if (!existing) {
        const role = repository.create(roleData);
        const saved = await repository.save(role);
        savedRoles.push(saved);
      } else {
        savedRoles.push(existing);
      }
    }

    console.log(`✅ Created ${savedRoles.length} roles`);
    return savedRoles;
  }

  private async createDefaultUsers(repository: any, roles: RoleEntity[]): Promise<void> {
    const superAdminRole = roles.find((r) => r.code === 'super_admin');
    const adminRole = roles.find((r) => r.code === 'admin');
    const userRole = roles.find((r) => r.code === 'user');

    const users = [
      {
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: 'Admin@123456',
        realName: '超级管理员',
        status: UserStatus.ACTIVE,
        roles: superAdminRole ? [superAdminRole] : [],
      },
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin@123456',
        realName: '管理员',
        status: UserStatus.ACTIVE,
        roles: adminRole ? [adminRole] : [],
      },
      {
        username: 'test',
        email: 'test@example.com',
        password: 'Test@123456',
        realName: '测试用户',
        status: UserStatus.ACTIVE,
        roles: userRole ? [userRole] : [],
      },
    ];

    for (const userData of users) {
      const existing = await repository.findOne({ where: { username: userData.username } });
      if (!existing) {
        const user = repository.create(userData);
        await repository.save(user);
        console.log(`✅ Created user: ${userData.username}`);
      }
    }
  }
}
