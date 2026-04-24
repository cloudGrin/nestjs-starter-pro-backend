/**
 * E2E 测试辅助工具
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserEntity } from '../src/modules/user/entities/user.entity';
import { RoleEntity, RoleCategory } from '../src/modules/role/entities/role.entity';
import { PermissionEntity } from '../src/modules/permission/entities/permission.entity';
import { UserStatus } from '../src/common/enums/user.enum';
import { CacheService } from '../src/shared/cache/cache.service';
import { CACHE_KEYS } from '../src/common/constants/cache.constants';
import request from 'supertest';

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // 配置全局管道（与main.ts保持一致）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

/**
 * 测试用户凭证
 */
export interface TestCredentials {
  accessToken: string;
  refreshToken: string;
  user: any;
}

/**
 * 创建测试用户并登录
 */
export async function createTestUserCredentials(
  app: INestApplication,
  userData: {
    username: string;
    email: string;
    password: string;
    realName?: string;
  },
): Promise<TestCredentials> {
  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(UserEntity);

  const existing = await userRepository.findOne({
    where: [{ username: userData.username }, { email: userData.email }] as any,
  });

  if (!existing) {
    await userRepository.save(
      userRepository.create({
        ...userData,
        status: UserStatus.ACTIVE,
        roles: [],
      }),
    );
  }

  return loginTestUser(app, {
    username: userData.username,
    password: userData.password,
  });
}

/**
 * 登录测试用户
 */
export async function loginTestUser(
  app: INestApplication,
  credentials: {
    username: string;
    password: string;
  },
): Promise<TestCredentials> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send(credentials)
    .expect(200);

  // 适配新的API响应结构: { tokens: {...}, user: {...} }
  const data = response.body.data;
  return {
    accessToken: data.tokens?.accessToken || data.accessToken,
    refreshToken: data.tokens?.refreshToken || data.refreshToken,
    user: data.user || data,
  };
}

/**
 * 生成唯一的测试用户名
 */
export function generateTestUsername(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * 生成唯一的测试邮箱
 */
export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * 创建带认证的请求辅助对象
 * 使用方式: authenticatedRequest(app, token).get('/endpoint')
 *
 * 注意：supertest 要求必须先调用 HTTP 动词方法（.get(), .post() 等），
 * 然后才能链式调用 .set()，所以这里返回一个包装对象
 */
export function authenticatedRequest(app: INestApplication, token: string) {
  const server = app.getHttpServer();
  const authHeader = `Bearer ${token}`;

  return {
    get: (url: string) => request(server).get(url).set('Authorization', authHeader),
    post: (url: string) => request(server).post(url).set('Authorization', authHeader),
    put: (url: string) => request(server).put(url).set('Authorization', authHeader),
    patch: (url: string) => request(server).patch(url).set('Authorization', authHeader),
    delete: (url: string) => request(server).delete(url).set('Authorization', authHeader),
  };
}

/**
 * 创建超级管理员角色（拥有所有权限）
 */
export async function createSuperAdminRole(app: INestApplication): Promise<RoleEntity> {
  const dataSource = app.get(DataSource);
  const roleRepository = dataSource.getRepository(RoleEntity);
  const permissionRepository = dataSource.getRepository(PermissionEntity);

  // 检查是否已经存在超级管理员角色(兼容大小写)
  let superAdminRole = await roleRepository.findOne({
    where: [{ code: 'super_admin' }, { code: 'SUPER_ADMIN' }],
    relations: ['permissions'],
  });

  if (!superAdminRole) {
    // 创建超级管理员角色（使用小写code，与JWT strategy和PermissionsGuard保持一致）
    superAdminRole = roleRepository.create({
      code: 'super_admin',
      name: '超级管理员',
      description: 'E2E测试用超级管理员角色，拥有所有权限',
      category: RoleCategory.SYSTEM,
      sort: 0,
      isActive: true,
      isSystem: true,
    });
  } else if (superAdminRole.code !== 'super_admin') {
    // 如果找到的是大写版本,更新为小写(确保与JWT strategy一致)
    superAdminRole.code = 'super_admin';
  }

  // 获取所有权限
  const allPermissions = await permissionRepository.find({
    where: { isActive: true },
  });

  if (allPermissions.length === 0) {
    console.warn('警告：数据库中没有权限数据，超级管理员将没有任何权限');
  }

  // 关联所有权限（无论是否新建/已有都会刷新权限集，确保不会缺失）
  superAdminRole.permissions = allPermissions;

  // 保存
  await roleRepository.save(superAdminRole);
  const rolePermissionRelation = dataSource
    .createQueryBuilder()
    .relation(RoleEntity, 'permissions')
    .of(superAdminRole);

  const existingPermissions = (await rolePermissionRelation.loadMany()) as PermissionEntity[];
  if (existingPermissions.length > 0) {
    await rolePermissionRelation.remove(existingPermissions.map((permission) => permission.id));
  }
  if (allPermissions.length > 0) {
    await rolePermissionRelation.add(allPermissions.map((permission) => permission.id));
  }

  return superAdminRole;
}

/**
 * 创建超级管理员用户并登录
 */
export async function createSuperAdminCredentials(
  app: INestApplication,
  userData: {
    username: string;
    email: string;
    password: string;
    realName?: string;
  },
): Promise<TestCredentials> {
  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(UserEntity);

  // 创建超级管理员角色
  const superAdminRole = await createSuperAdminRole(app);

  let user = await userRepository.findOne({
    where: [{ username: userData.username }, { email: userData.email }] as any,
    relations: ['roles'],
  });

  if (!user) {
    user = userRepository.create({
      ...userData,
      status: UserStatus.ACTIVE,
      roles: [superAdminRole],
    });
    user = await userRepository.save(user);
  }

  const userId = (user as UserEntity).id; // 提取 id 避免 TypeScript 类型推断问题

  // 更新用户状态并分配超级管理员角色
  user.status = UserStatus.ACTIVE;
  user.roles = [superAdminRole];

  // 保存用户（CASCADE会自动处理user_roles关联表）
  await userRepository.save(user);

  // 由于CASCADE机制在某些情况下可能不稳定，手动确保user_roles记录存在
  await dataSource.query('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [
    userId,
    superAdminRole.id,
  ]);

  // 等待一小段时间确保数据库写入完成
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 验证角色分配
  const userWithRoles = await userRepository.findOne({
    where: { id: userId } as any,
    relations: ['roles'],
  });

  if (!userWithRoles?.roles || userWithRoles.roles.length === 0) {
    throw new Error(`[测试辅助] 角色分配失败！userId=${userId}`);
  }

  // 清除与用户权限相关的缓存，避免 RBAC 2.0 缓存命中导致权限缺失
  await app.get(CacheService).del(CACHE_KEYS.USER_PERMISSIONS(userId));

  // 重新登录以获取包含新权限的JWT token
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      account: userData.username,
      password: userData.password,
    })
    .expect(200);

  // 适配新的API响应结构: { tokens: {...}, user: {...} }
  const data = loginResponse.body.data;
  const result = {
    accessToken: data.tokens?.accessToken || data.accessToken,
    refreshToken: data.tokens?.refreshToken || data.refreshToken,
    user: data.user || data,
  };

  return result;
}
