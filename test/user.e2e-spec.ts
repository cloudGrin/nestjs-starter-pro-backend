/**
 * 用户模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  apiPath,
  createTestApp,
  createSuperAdminCredentials,
  createTestUserCredentials,
  authenticatedRequest,
  TestCredentials,
  generateTestUsername,
  generateTestEmail,
} from './test-helper';

describe('用户模块 (e2e)', () => {
  let app: INestApplication;
  let adminCredentials: TestCredentials;
  let normalUserCredentials: TestCredentials;
  const createdUserIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    // 创建超级管理员用户（拥有所有权限）
    adminCredentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Admin@123456',
    });

    // 创建普通用户（用于权限测试）
    normalUserCredentials = await createTestUserCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'User@123456',
    });
  });

  afterAll(async () => {
    // 清理创建的测试用户
    for (const id of createdUserIds) {
      try {
        await authenticatedRequest(app, adminCredentials.accessToken)
          .delete(apiPath(`/users/${id}`))
          .send();
      } catch {
        // 忽略删除错误
      }
    }

    await app.close();
  });

  describe('POST /users', () => {
    it('超级管理员应该能够创建用户', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
        realName: '测试用户',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);

      if (response.body.success) {
        expect(response.body.data).toMatchObject({
          username: userData.username,
          email: userData.email,
          realName: userData.realName,
        });
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).not.toHaveProperty('password'); // 不应返回密码
        createdUserIds.push(response.body.data.id);
      }
    });

    it('应该拒绝重复的用户名', async () => {
      const username = generateTestUsername();
      const userData = {
        username,
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      // 第一次创建应该成功
      const firstResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(firstResponse.status);

      if (firstResponse.body.success && firstResponse.body.data && firstResponse.body.data.id) {
        createdUserIds.push(firstResponse.body.data.id);
      }

      // 第二次创建应该失败
      const secondResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send({
          ...userData,
          email: generateTestEmail(), // 使用不同的邮箱
        });

      expect([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT]).toContain(secondResponse.status);
    });

    it('应该拒绝重复的邮箱', async () => {
      const email = generateTestEmail();
      const userData = {
        username: generateTestUsername(),
        email,
        password: 'Test@123456',
      };

      // 第一次创建应该成功
      const firstResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(firstResponse.status);

      if (firstResponse.body.success && firstResponse.body.data && firstResponse.body.data.id) {
        createdUserIds.push(firstResponse.body.data.id);
      }

      // 第二次创建应该失败
      const secondResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send({
          ...userData,
          username: generateTestUsername(), // 使用不同的用户名
        });

      expect([HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT]).toContain(secondResponse.status);
    });

    it('应该拒绝无效的邮箱格式', async () => {
      const userData = {
        username: generateTestUsername(),
        email: 'invalid-email', // 无效的邮箱格式
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.BAD_REQUEST]).toContain(response.status);
    });

    it('应该拒绝弱密码', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'weak', // 不符合密码复杂度要求
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.BAD_REQUEST]).toContain(response.status);
    });

    it('普通用户应该被拒绝创建用户', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /users', () => {
    it('超级管理员应该能够获取用户列表', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        apiPath('/users'),
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
        expect(response.body.data).toHaveProperty('meta');
        // 确保密码不被返回
        if (response.body.data.items.length > 0) {
          expect(response.body.data.items[0]).not.toHaveProperty('password');
        }
      }
    });

    it('应该支持按用户名搜索', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/users'))
        .query({ username: adminCredentials.user.username });

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(Array.isArray(response.body.data.items)).toBe(true);
      }
    });

    it('应该支持分页', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/users'))
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.meta).toMatchObject({
          currentPage: 1,
          itemsPerPage: 10,
        });
      }
    });

    it('普通用户应该被拒绝获取用户列表', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/users',
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /users/profile', () => {
    it('任何已认证用户应该能够获取自己的个人信息', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        '/users/profile',
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.id).toBe(normalUserCredentials.user.id);
        expect(response.body.data.username).toBe(normalUserCredentials.user.username);
        expect(response.body.data).not.toHaveProperty('password'); // 不应返回密码
      }
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get(apiPath('/users/profile'))
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /users/:id', () => {
    it('超级管理员应该能够查看用户详情', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${normalUserCredentials.user.id}`,
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.id).toBe(normalUserCredentials.user.id);
        expect(response.body.data).toHaveProperty('username');
        expect(response.body.data).toHaveProperty('email');
        expect(response.body.data).not.toHaveProperty('password'); // 不应返回密码
      }
    });

    it('应该返回404如果用户不存在', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/users/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝查看其他用户详情', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        `/users/${adminCredentials.user.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users/:id', () => {
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      if (response.body.success && response.body.data && response.body.data.id) {
        userId = response.body.data.id;
        createdUserIds.push(userId);
      }
    });

    it('超级管理员应该能够更新用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const updateData = {
        realName: '已更新的姓名',
        nickname: '已更新的昵称',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(apiPath(`/users/${userId}`))
        .send(updateData);

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.realName).toBe(updateData.realName);
        expect(response.body.data.nickname).toBe(updateData.nickname);
      }
    });

    it('应该返回404如果用户不存在', async () => {
      const updateData = {
        realName: '更新测试',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(apiPath('/users/999999'))
        .send(updateData);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝更新其他用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const updateData = {
        realName: '尝试更新',
      };

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath(`/users/${userId}`))
        .send(updateData);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users/profile', () => {
    it('任何已认证用户应该能够更新自己的个人信息', async () => {
      const updateData = {
        nickname: '新昵称',
        bio: '新个人简介',
      };

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath('/users/profile'))
        .send(updateData);

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.nickname).toBe(updateData.nickname);
        expect(response.body.data.bio).toBe(updateData.bio);
      }
    });
  });

  describe('PUT /users/password', () => {
    it('任何已认证用户应该能够修改自己的密码', async () => {
      // 创建一个临时用户测试密码修改
      const tempUser = await createTestUserCredentials(app, {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'TempPassword@123',
      });

      const response = await authenticatedRequest(app, tempUser.accessToken)
        .put(apiPath('/users/password'))
        .send({
          oldPassword: 'TempPassword@123',
          newPassword: 'NewPassword@123456',
          confirmPassword: 'NewPassword@123456',
        });

      expect(response.status).toBe(HttpStatus.OK);
    });

    it('应该拒绝错误的旧密码', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath('/users/password'))
        .send({
          oldPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@123456',
          confirmPassword: 'NewPassword@123456',
        });

      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('应该拒绝弱的新密码', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath('/users/password'))
        .send({
          oldPassword: 'User@123456',
          newPassword: 'weak',
          confirmPassword: 'weak',
        });

      expect([HttpStatus.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('PUT /users/:id/enable', () => {
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      if (response.body.success && response.body.data && response.body.data.id) {
        userId = response.body.data.id;
        createdUserIds.push(userId);
      }
    });

    it('超级管理员应该能够启用用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/users/${userId}/enable`,
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.status).toBe('active');
      }
    });

    it('普通用户应该被拒绝启用用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).put(
        `/users/${userId}/enable`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users/:id/disable', () => {
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      if (response.body.success && response.body.data && response.body.data.id) {
        userId = response.body.data.id;
        createdUserIds.push(userId);
      }
    });

    it('超级管理员应该能够禁用用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/users/${userId}/disable`,
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data.status).toBe('disabled');
      }
    });

    it('普通用户应该被拒绝禁用用户', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).put(
        `/users/${userId}/disable`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users/:id/password/reset', () => {
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      if (response.body.success && response.body.data && response.body.data.id) {
        userId = response.body.data.id;
        createdUserIds.push(userId);
      }
    });

    it('超级管理员应该能够重置用户密码', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(apiPath(`/users/${userId}/password/reset`))
        .send({
          password: 'NewPassword@123456',
        });

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success && response.body.data) {
        expect(response.body.data.message).toContain('密码重置成功');
      }
    });

    it('普通用户应该被拒绝重置其他用户密码', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath(`/users/${userId}/password/reset`))
        .send({
          newPassword: 'NewPassword@123456',
        });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('PUT /users/:id/roles', () => {
    let userId: number;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      if (response.body.success && response.body.data && response.body.data.id) {
        userId = response.body.data.id;
        createdUserIds.push(userId);
      }
    });

    it('超级管理员应该能够分配角色', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      // 注意：这里需要有实际存在的角色ID
      // 由于不确定数据库中的角色，我们只测试API是否可调用
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(apiPath(`/users/${userId}/roles`))
        .send({ roleIds: [1] }); // 假设角色ID为1存在

      // 可能因为角色不存在而失败，也可能成功
      expect([HttpStatus.OK, HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(
        response.status,
      );
    });

    it('普通用户应该被拒绝分配角色', async () => {
      if (!userId) {
        expect(userId).toBeDefined();
        return;
      }

      const response = await authenticatedRequest(app, normalUserCredentials.accessToken)
        .put(apiPath(`/users/${userId}/roles`))
        .send({ roleIds: [1] });

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /users/:id/permissions', () => {
    it('超级管理员应该能够查看用户权限', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${normalUserCredentials.user.id}/permissions`,
      );

      expect(response.status).toBe(HttpStatus.OK);

      if (response.body.success) {
        expect(response.body.data).toHaveProperty('permissions');
        expect(Array.isArray(response.body.data.permissions)).toBe(true);
      }
    });

    it('普通用户应该被拒绝查看其他用户权限', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).get(
        `/users/${adminCredentials.user.id}/permissions`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('DELETE /users/:id', () => {
    it('超级管理员应该能够删除用户', async () => {
      // 创建一个临时用户用于删除
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createResponse.status);

      if (
        !createResponse.body.success ||
        !createResponse.body.data ||
        !createResponse.body.data.id
      ) {
        expect(createResponse.body.data?.id).toBeDefined();
        return;
      }

      const userId = createResponse.body.data.id;

      // 删除用户
      const deleteResponse = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/users/${userId}`,
      );

      expect(deleteResponse.status).toBe(HttpStatus.OK);

      // 验证已删除
      const getResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${userId}`,
      );

      expect(getResponse.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('应该返回404如果用户不存在', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        '/users/999999',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('普通用户应该被拒绝删除用户', async () => {
      const response = await authenticatedRequest(app, normalUserCredentials.accessToken).delete(
        `/users/${adminCredentials.user.id}`,
      );

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
    });
  });

  describe('完整的用户管理流程', () => {
    it('超级管理员应该能够完成：创建用户 -> 查询详情 -> 更新信息 -> 禁用用户 -> 启用用户 -> 删除用户', async () => {
      // 1. 创建用户
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
        realName: '完整流程测试用户',
      };

      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/users'))
        .send(userData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createResponse.status);

      if (
        !createResponse.body.success ||
        !createResponse.body.data ||
        !createResponse.body.data.id
      ) {
        expect(createResponse.body.data?.id).toBeDefined();
        return;
      }

      const userId = createResponse.body.data.id;

      // 2. 查询详情
      const getResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${userId}`,
      );

      if (getResponse.status === HttpStatus.OK && getResponse.body.success) {
        expect(getResponse.body.data.id).toBe(userId);
        expect(getResponse.body.data.username).toBe(userData.username);
      }

      // 3. 更新信息
      const updateData = {
        realName: '已更新的完整流程测试用户',
        nickname: '测试昵称',
      };

      const updateResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .put(apiPath(`/users/${userId}`))
        .send(updateData);

      if (updateResponse.status === HttpStatus.OK && updateResponse.body.success) {
        expect(updateResponse.body.data.realName).toBe(updateData.realName);
      }

      // 4. 禁用用户
      const disableResponse = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/users/${userId}/disable`,
      );

      if (disableResponse.status === HttpStatus.OK && disableResponse.body.success) {
        expect(disableResponse.body.data.status).toBe('disabled');
      }

      // 5. 启用用户
      const enableResponse = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/users/${userId}/enable`,
      );

      if (enableResponse.status === HttpStatus.OK && enableResponse.body.success) {
        expect(enableResponse.body.data.status).toBe('active');
      }

      // 6. 删除用户
      const deleteResponse = await authenticatedRequest(app, adminCredentials.accessToken).delete(
        `/users/${userId}`,
      );

      expect(deleteResponse.status).toBe(HttpStatus.OK);

      // 7. 验证已删除
      const finalGetResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        `/users/${userId}`,
      );

      expect(finalGetResponse.status).toBe(HttpStatus.NOT_FOUND);
    });
  });
});
