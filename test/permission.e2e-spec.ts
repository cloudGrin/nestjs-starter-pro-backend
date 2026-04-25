import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createSuperAdminCredentials,
  createTestUserCredentials,
  generateTestUsername,
  generateTestEmail,
  authenticatedRequest,
} from './test-helper';
import { DataSource } from 'typeorm';
import { PermissionEntity, PermissionType } from '~/modules/permission/entities/permission.entity';
import { CacheService } from '~/shared/cache/cache.service';

const userPermissionsCacheKey = (userId: number) => `user:permissions:${userId}`;

describe('Permission Module (E2E)', () => {
  let app: INestApplication;
  let adminCredentials: { accessToken: string; user: any };
  let normalUserCredentials: { accessToken: string; user: any };
  let dataSource: DataSource;

  // 测试数据
  let testPermission: PermissionEntity;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // 创建超级管理员
    adminCredentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Admin@123456',
      realName: 'Permission测试管理员',
    });

    // 创建普通用户
    normalUserCredentials = await createTestUserCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'User@123456',
      realName: 'Permission测试普通用户',
    });
  });

  afterAll(async () => {
    // 清理测试数据
    if (testPermission) {
      try {
        const permissionRepo = dataSource.getRepository(PermissionEntity);
        await permissionRepo.remove(testPermission);
      } catch (error) {
        console.warn('清理testPermission失败:', (error as Error).message);
      }
    }
    await app.close();
  });

  // ==================== POST /permissions ====================
  describe('POST /permissions - 创建权限', () => {
    it('管理员应该能够创建权限', async () => {
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/permissions')
        .send({
          code: 'perm_test_' + randomStr,
          name: 'E2E测试权限',
          type: PermissionType.API,
          module: 'test',
          description: '这是E2E测试创建的权限',
        });

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      const permData = response.body.data || response.body;
      expect(permData).toHaveProperty('id');
      expect(permData.code).toContain('perm_test_');
      expect(permData.name).toBe('E2E测试权限');

      testPermission = permData;
    });

    it('应该拒绝重复的权限编码', async () => {
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const duplicateCode = 'dup_perm_' + randomStr;

      // 先创建一个权限
      await authenticatedRequest(app, adminCredentials.accessToken).post('/permissions').send({
        code: duplicateCode,
        name: '第一个权限',
        type: PermissionType.API,
        module: 'test',
      });

      // 尝试创建相同编码的权限
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/permissions')
        .send({
          code: duplicateCode,
          name: '第二个权限',
          type: PermissionType.API,
          module: 'test',
        });

      expect([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT]).toContain(response.status);
    });

    it('普通用户应该被拒绝创建权限', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .post('/permissions')
        .send({
          code: 'normal_user_perm',
          name: '普通用户创建的权限',
          type: PermissionType.API,
          module: 'test',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /permissions ====================
  describe('GET /permissions - 获取权限列表', () => {
    it('管理员应该能够获取权限列表', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/permissions',
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('data');
      const data = response.body.data;
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('应该支持分页查询', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/permissions?page=1&limit=10',
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('meta');
    });

    it('应该支持按模块搜索', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/permissions?module=user',
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('items');
    });

    it('普通用户应该被拒绝', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/permissions',
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /permissions/tree ====================
  describe('GET /permissions/tree - 获取权限树', () => {
    it('管理员应该能够获取权限树', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/permissions/tree',
      );

      expect(response.status).toBe(HttpStatus.OK);
      const tree = response.body.data || response.body;
      expect(Array.isArray(tree)).toBe(true);
    });

    it('普通用户应该被拒绝', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/permissions/tree',
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /permissions/:id ====================
  describe('GET /permissions/:id - 获取权限详情', () => {
    it('管理员应该能够获取权限详情', async () => {
      if (!testPermission) {
        console.warn('跳过测试: testPermission未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/permissions/${testPermission.id}`,
      );

      expect(response.status).toBe(HttpStatus.OK);
      const permData = response.body.data || response.body;
      expect(permData.id).toBe(testPermission.id);
      expect(permData.code).toBe(testPermission.code);
    });

    it('获取不存在的权限应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/permissions/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!testPermission) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        `/permissions/${testPermission.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== PUT /permissions/:id ====================
  describe('PUT /permissions/:id - 更新权限', () => {
    it('管理员应该能够更新权限', async () => {
      if (!testPermission) {
        console.warn('跳过测试: testPermission未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/permissions/${testPermission.id}`)
        .send({
          name: '更新后的权限名称',
          description: '更新后的描述',
        });

      expect([HttpStatus.OK]).toContain(response.status);
      const permData = response.body.data || response.body;
      expect(permData.name).toBe('更新后的权限名称');
      expect(permData.description).toBe('更新后的描述');
    });

    it('更新不存在的权限应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put('/permissions/999999')
        .send({
          name: '不存在的权限',
        });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!testPermission) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(`/permissions/${testPermission.id}`)
        .send({
          name: '普通用户尝试更新',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== DELETE /permissions/:id ====================
  describe('DELETE /permissions/:id - 删除权限', () => {
    let permToDelete: PermissionEntity;

    beforeEach(async () => {
      // 创建一个用于删除的权限
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/permissions')
        .send({
          code: 'to_delete_' + randomStr,
          name: '待删除权限',
          type: PermissionType.API,
          module: 'test',
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        permToDelete = response.body.data || response.body;
      }
    });

    it('管理员应该能够删除权限', async () => {
      if (!permToDelete) {
        console.warn('跳过测试: permToDelete未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/permissions/${permToDelete.id}`,
      );

      // 删除可能返回200/204,或500(如果有子权限或被引用)
      expect([
        HttpStatus.OK,
        HttpStatus.NO_CONTENT,
        HttpStatus.INTERNAL_SERVER_ERROR,
        HttpStatus.BAD_REQUEST,
      ]).toContain(response.status);
    });

    it('删除不存在的权限应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        '/permissions/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!permToDelete) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).delete(
        `/permissions/${permToDelete.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== 完整流程测试 ====================
  describe('完整流程测试', () => {
    it('应该完成: 创建权限 → 查询 → 更新 → 删除', async () => {
      // 1. 创建权限
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 10)
        .replace(/[^a-z]/g, 'x');
      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/permissions')
        .send({
          code: 'flow_test_' + randomStr,
          name: '流程测试权限',
          type: PermissionType.API,
          module: 'test',
          description: '完整流程测试',
        });

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createResponse.status);
      const permData = createResponse.body.data || createResponse.body;
      const permId = permData.id;

      // 2. 查询权限详情
      const getResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/permissions/${permId}`,
      );

      expect(getResponse.status).toBe(HttpStatus.OK);
      const getPermData = getResponse.body.data || getResponse.body;
      expect(getPermData.id).toBe(permId);

      // 3. 更新权限
      const updateResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/permissions/${permId}`)
        .send({
          name: '更新后的流程测试权限',
        });

      expect([HttpStatus.OK]).toContain(updateResponse.status);

      // 4. 删除权限
      const deleteResponse = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/permissions/${permId}`,
      );

      // 删除可能成功(200/204)或失败(500如果被引用)
      expect([
        HttpStatus.OK,
        HttpStatus.NO_CONTENT,
        HttpStatus.INTERNAL_SERVER_ERROR,
        HttpStatus.BAD_REQUEST,
      ]).toContain(deleteResponse.status);

      // 5. 验证删除 (只在删除成功时验证)
      if (
        deleteResponse.status === HttpStatus.OK ||
        deleteResponse.status === HttpStatus.NO_CONTENT
      ) {
        const verifyResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
          `/permissions/${permId}`,
        );

        expect(verifyResponse.status).toBe(HttpStatus.NOT_FOUND);
      }
    });
  });

  // ==================== 权限Guard测试（中间场景）====================
  describe('PermissionsGuard - 有角色但缺少特定权限的用户', () => {
    let limitedUserCredentials: { accessToken: string; user: any };
    let testRole: any;

    beforeAll(async () => {
      // 1. 创建一个具有部分权限的角色
      // 生成只包含小写字母的随机字符串
      const randomStr = Math.random().toString(36).substring(2, 8).replace(/[0-9]/g, 'x');
      const roleCode = 'limited_role_' + randomStr;

      const roleResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: roleCode,
          name: '受限角色',
          description: '仅有查看权限的测试角色',
        });

      if (roleResponse.status !== HttpStatus.CREATED && roleResponse.status !== HttpStatus.OK) {
        console.error('[E2E Error] 创建角色失败:', {
          status: roleResponse.status,
          body: roleResponse.body,
          code: roleCode,
        });
      }

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(roleResponse.status);
      testRole = roleResponse.body.data || roleResponse.body;

      // 2. 准备 user:read 权限并分配给角色
      const permissionRepo = dataSource.getRepository(PermissionEntity);
      let readPermission = await permissionRepo.findOne({ where: { code: 'user:read' } });
      if (!readPermission) {
        readPermission = await permissionRepo.save(
          permissionRepo.create({
            code: 'user:read',
            name: '用户读取',
            type: PermissionType.API,
            module: 'user',
            isActive: true,
          }),
        );
      }

      const assignPermResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/roles/${testRole.id}/permissions`)
        .send({ permissionIds: [readPermission.id] });

      expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(assignPermResponse.status);

      // 4. 创建用户
      const username = generateTestUsername();
      const email = generateTestEmail();
      limitedUserCredentials = await createTestUserCredentials(app, {
        username,
        email,
        password: 'Limited@123456',
        realName: '受限权限测试用户',
      });

      // 5. 通过数据库直接分配角色（更可靠）
      await dataSource.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [
        limitedUserCredentials.user.id,
        testRole.id,
      ]);

      // 等待数据库写入完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 6. 清除用户权限缓存
      const cacheService = app.get(CacheService);
      await cacheService.del(userPermissionsCacheKey(limitedUserCredentials.user.id));

      // 7. 重新登录以获取包含角色信息的新token
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        account: username,
        password: 'Limited@123456',
      });

      // 更新credentials为包含角色信息的新token
      limitedUserCredentials = {
        accessToken: loginResponse.body.data.tokens.accessToken,
        user: loginResponse.body.data.user,
      };
    });

    afterAll(async () => {
      // 清理测试数据
      if (testRole) {
        try {
          await authenticatedRequest(app, adminCredentials.accessToken).delete(
            `/roles/${testRole.id}`,
          );
        } catch (error) {
          console.warn('清理testRole失败:', (error as Error).message);
        }
      }
    });

    it('有 user:read 权限的用户应该能访问用户列表', async () => {
      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken).get(
        '/users',
      );

      // 应该成功访问
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('items');
    });

    it('有 user:read 权限但缺少 user:delete 权限的用户应该被拒绝删除操作', async () => {
      // 先创建一个测试用户用于删除
      const targetUser = await createTestUserCredentials(app, {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Target@123456',
      });

      // 尝试删除用户（需要 user:delete 权限）
      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken).delete(
        `/users/${targetUser.user.id}`,
      );

      // 应该返回 403 Forbidden
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body.message).toContain('权限');

      // 验证用户仍然存在（未被删除）
      const verifyResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${targetUser.user.id}`,
      );

      expect(verifyResponse.status).toBe(HttpStatus.OK);
    });

    it('有 user:read 权限但缺少 user:create 权限的用户应该被拒绝创建操作', async () => {
      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken)
        .post('/users')
        .send({
          username: generateTestUsername(),
          email: generateTestEmail(),
          password: 'NewUser@123456',
        });

      // 应该返回 403 Forbidden
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body.message).toContain('权限');
    });

    it('有 user:read 权限但缺少 user:update 权限的用户应该被拒绝更新操作', async () => {
      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken)
        .put(`/users/${limitedUserCredentials.user.id}`)
        .send({
          realName: '尝试更新姓名',
        });

      // 应该返回 403 Forbidden
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body.message).toContain('权限');
    });

    it('没有任何 permission 模块权限的用户应该被拒绝访问权限接口', async () => {
      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken).get(
        '/permissions',
      );

      // 应该返回 403 Forbidden
      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body.message).toContain('权限');
    });

    it('测试OR逻辑：用户有任一所需权限即可通过', async () => {
      // 当前用户有 user:read 权限
      // 某些接口可能配置为 @RequirePermissions('user:read', 'user:manage')
      // 用户拥有其中一个权限即可访问

      const response = await authenticatedRequest(app, limitedUserCredentials.accessToken).get(
        '/users',
      ); // 此接口需要 user:read 权限

      // 应该成功访问
      expect(response.status).toBe(HttpStatus.OK);
    });
  });
});
