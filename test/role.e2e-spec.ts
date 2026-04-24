import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '~/app.module';
import { ValidationPipe } from '@nestjs/common';
import {
  createTestApp,
  createSuperAdminCredentials,
  createTestUserCredentials,
  generateTestUsername,
  generateTestEmail,
  authenticatedRequest,
} from './test-helper';
import { DataSource } from 'typeorm';
import { RoleEntity, RoleCategory } from '~/modules/role/entities/role.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';

describe('Role Module (E2E)', () => {
  let app: INestApplication;
  let adminCredentials: { accessToken: string; user: any };
  let normalUserCredentials: { accessToken: string; user: any };
  let dataSource: DataSource;

  // 测试数据
  let testRole: RoleEntity;
  let testPermissions: PermissionEntity[];

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);

    // 创建超级管理员(用于测试管理功能)
    adminCredentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Admin@123456',
      realName: 'E2E超级管理员',
    });

    // 创建普通用户(用于测试权限边界)
    normalUserCredentials = await createTestUserCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'User@123456',
      realName: 'E2E普通用户',
    });

    // 准备测试数据 - 创建一些权限(先检查是否存在)
    const permissionRepo = dataSource.getRepository(PermissionEntity);

    // 检查权限是否已存在
    let testReadPerm = await permissionRepo.findOne({ where: { code: 'test:read' } });
    let testWritePerm = await permissionRepo.findOne({ where: { code: 'test:write' } });

    // 如果不存在则创建
    if (!testReadPerm) {
      testReadPerm = await permissionRepo.save({
        code: 'test:read',
        name: '测试读取',
        module: 'test',
        isActive: true,
      });
    }

    if (!testWritePerm) {
      testWritePerm = await permissionRepo.save({
        code: 'test:write',
        name: '测试写入',
        module: 'test',
        isActive: true,
      });
    }

    testPermissions = [testReadPerm, testWritePerm];
  });

  afterAll(async () => {
    // 清理测试数据(不删除权限和权限组,因为它们可能被其他数据引用)
    // 测试权限和权限组会在下次测试时复用,不影响测试独立性
    if (testRole) {
      try {
        const roleRepo = dataSource.getRepository(RoleEntity);
        await roleRepo.remove(testRole);
      } catch (error) {
        console.warn('清理testRole失败(可能已被删除):', (error as Error).message);
      }
    }
    await app.close();
  });

  // ==================== POST /roles ====================
  describe('POST /roles - 创建角色', () => {
    it('管理员应该能够创建角色', async () => {
      // code只能包含小写字母和下划线,不能包含数字
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: 'test_role_' + randomStr,
          name: 'E2E测试角色',
          description: '这是E2E测试创建的角色',
          sort: 10,
          isActive: true,
        });

      // 打印响应以便调试
      if (![HttpStatus.CREATED, HttpStatus.OK].includes(response.status)) {
        console.error('创建角色失败:', {
          status: response.status,
          body: response.body,
        });
      }

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);

      // 响应可能在body或body.data中
      const roleData = response.body.data || response.body;
      expect(roleData).toHaveProperty('id');
      expect(roleData.code).toContain('test_role_');
      expect(roleData.name).toBe('E2E测试角色');

      testRole = roleData; // 保存用于后续测试
    });

    it('应该拒绝重复的角色编码', async () => {
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const duplicateCode = 'duplicate_code_' + randomStr;

      // 先创建一个角色
      await authenticatedRequest(app, adminCredentials.accessToken).post('/roles').send({
        code: duplicateCode,
        name: '第一个角色',
      });

      // 尝试创建相同编码的角色
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: duplicateCode,
          name: '第二个角色',
        });

      // 400 (Bad Request) 或 409 (Conflict) 都是合理的
      expect([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT]).toContain(response.status);
    });

    it('应该拒绝无效的角色编码格式', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: 'InvalidCode123', // 包含大写和数字
          name: '无效格式测试',
        });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('普通用户应该被拒绝创建角色', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .post('/roles')
        .send({
          code: 'normal_user_role',
          name: '普通用户创建的角色',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /roles ====================
  describe('GET /roles - 获取角色列表', () => {
    it('管理员应该能够获取角色列表', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get('/roles');

      expect([HttpStatus.OK]).toContain(response.status);
      expect(response.body).toHaveProperty('data');
      // 分页响应: {data: {items: [...], meta: {...}}}
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('应该支持分页查询', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/roles?page=1&limit=10',
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('totalItems');
    });

    it('应该支持按名称搜索', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/roles?name=E2E',
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('data');
    });

    it('普通用户应该被拒绝', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/roles',
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /roles/active ====================
  describe('GET /roles/active - 获取活跃角色', () => {
    it('管理员应该能够获取所有活跃角色', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/roles/active',
      );

      expect(response.status).toBe(HttpStatus.OK);
      // 检查响应格式
      const roles = Array.isArray(response.body) ? response.body : response.body.data;
      expect(Array.isArray(roles)).toBe(true);
      // 所有返回的角色都应该是活跃的
      roles.forEach((role: any) => {
        expect(role.isActive).toBe(true);
      });
    });

    it('普通用户应该被拒绝', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/roles/active',
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== GET /roles/:id ====================
  describe('GET /roles/:id - 获取角色详情', () => {
    it('管理员应该能够获取角色详情', async () => {
      if (!testRole) {
        console.warn('跳过测试: testRole未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/roles/${testRole.id}`,
      );

      expect(response.status).toBe(HttpStatus.OK);
      const roleData = response.body.data || response.body;
      expect(roleData.id).toBe(testRole.id);
      expect(roleData.code).toBe(testRole.code);
    });

    it('获取不存在的角色应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/roles/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!testRole) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        `/roles/${testRole.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== PUT /roles/:id ====================
  describe('PUT /roles/:id - 更新角色', () => {
    it('管理员应该能够更新角色', async () => {
      if (!testRole) {
        console.warn('跳过测试: testRole未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/roles/${testRole.id}`)
        .send({
          name: '更新后的角色名称',
          description: '更新后的描述',
        });

      expect([HttpStatus.OK]).toContain(response.status);
      const roleData = response.body.data || response.body;
      expect(roleData.name).toBe('更新后的角色名称');
      expect(roleData.description).toBe('更新后的描述');
    });

    it('更新不存在的角色应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put('/roles/999999')
        .send({
          name: '不存在的角色',
        });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!testRole) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(`/roles/${testRole.id}`)
        .send({
          name: '普通用户尝试更新',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== DELETE /roles/:id ====================
  describe('DELETE /roles/:id - 删除角色', () => {
    let roleToDelete: RoleEntity;

    beforeEach(async () => {
      // 创建一个用于删除的角色(code只能包含小写字母和下划线)
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .replace(/[^a-z]/g, 'x');
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: 'to_delete_' + randomStr,
          name: '待删除角色',
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        roleToDelete = response.body.data || response.body;
      }
    });

    it('管理员应该能够删除角色', async () => {
      if (!roleToDelete) {
        console.warn('跳过测试: roleToDelete未创建');
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/roles/${roleToDelete.id}`,
      );

      expect([HttpStatus.OK, HttpStatus.NO_CONTENT]).toContain(response.status);
    });

    it('删除不存在的角色应该返回404', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        '/roles/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝', async () => {
      if (!roleToDelete) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).delete(
        `/roles/${roleToDelete.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== PUT /roles/:id/permissions ====================
  describe('PUT /roles/:id/permissions - 分配权限', () => {
    it('管理员应该能够为角色分配权限', async () => {
      if (!testRole || !testPermissions?.length) {
        console.warn('跳过测试: 测试数据未准备');
        return;
      }

      const permissionIds = testPermissions.map((p) => p.id);
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/roles/${testRole.id}/permissions`)
        .send({ permissionIds });

      expect([HttpStatus.OK]).toContain(response.status);
    });

    it('应该拒绝不存在的权限ID', async () => {
      if (!testRole) return;

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(`/roles/${testRole.id}/permissions`)
        .send({ permissionIds: [999999] });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('普通用户应该被拒绝', async () => {
      if (!testRole) return;

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(`/roles/${testRole.id}/permissions`)
        .send({ permissionIds: [] });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  // ==================== 完整流程测试 ====================
  describe('完整流程测试', () => {
    it('应该完成: 创建角色 → 分配权限 → 查询 → 删除', async () => {
      // 1. 创建角色 - code只能包含小写字母和下划线
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 10)
        .replace(/[^a-z]/g, 'x');
      const uniqueCode = 'flow_test_' + randomStr;
      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post('/roles')
        .send({
          code: uniqueCode,
          name: '流程测试角色',
          description: '完整流程测试',
        });

      // 如果创建失败,打印错误信息
      if (![HttpStatus.CREATED, HttpStatus.OK].includes(createResponse.status)) {
        console.error('创建角色失败:', createResponse.status, createResponse.body);
      }
      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createResponse.status);

      // 响应可能在body或body.data中
      const roleData = createResponse.body.data || createResponse.body;
      const roleId = roleData.id;

      // 2. 分配权限
      if (testPermissions?.length) {
        const assignResponse = await authenticatedRequest(app, adminCredentials.accessToken)
          .put(`/roles/${roleId}/permissions`)
          .send({ permissionIds: testPermissions.map((p) => p.id) });

        // 如果失败,打印错误
        if (![HttpStatus.OK, HttpStatus.CREATED].includes(assignResponse.status)) {
          console.error('分配权限失败:', assignResponse.status, assignResponse.body);
        }
        expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(assignResponse.status);
      }

      // 3. 查询角色详情
      const getResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/roles/${roleId}`,
      );

      expect(getResponse.status).toBe(HttpStatus.OK);
      const getRoleData = getResponse.body.data || getResponse.body;
      expect(getRoleData.id).toBe(roleId);

      // 4. 删除角色
      const deleteResponse = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/roles/${roleId}`,
      );

      expect([HttpStatus.OK, HttpStatus.NO_CONTENT]).toContain(deleteResponse.status);

      // 5. 验证删除
      const verifyResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/roles/${roleId}`,
      );

      expect(verifyResponse.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
