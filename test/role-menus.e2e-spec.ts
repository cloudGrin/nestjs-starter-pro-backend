/**
 * 角色-菜单关联 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import {
  createTestApp,
  createSuperAdminCredentials,
  authenticatedRequest,
  TestCredentials,
  generateTestUsername,
  generateTestEmail,
} from './test-helper';

describe('角色-菜单关联 (e2e)', () => {
  let app: INestApplication;
  let credentials: TestCredentials;
  let roleId: number;
  const menuIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    // 创建超级管理员并登录
    credentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Test@123456',
    });

    // 创建测试角色
    // code只能包含小写字母和下划线,不能包含数字
    const randomStr = Math.random()
      .toString(36)
      .substring(2, 10)
      .replace(/[^a-z]/g, 'x');
    const roleData = {
      code: `test_role_${randomStr}`,
      name: '测试角色',
      description: 'E2E 测试角色',
    };

    const roleResponse = await authenticatedRequest(app, credentials.accessToken)
      .post('/roles')
      .send(roleData);

    expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(roleResponse.status);
    roleId = roleResponse.body.data.id;

    // 创建测试菜单
    const menuDataList = [
      { name: '系统管理', path: '/system', type: 'directory', sort: 1 },
      { name: '用户管理', path: '/system/users', type: 'menu', sort: 2 },
      { name: '角色管理', path: '/system/roles', type: 'menu', sort: 3 },
    ];

    for (const menuData of menuDataList) {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      menuIds.push(response.body.data.id);
    }
  });

  afterAll(async () => {
    // 清理测试数据
    for (const menuId of menuIds) {
      try {
        await authenticatedRequest(app, credentials.accessToken).delete(`/menus/${menuId}`).send();
      } catch (error) {
        // 忽略删除错误
      }
    }

    if (roleId) {
      try {
        await authenticatedRequest(app, credentials.accessToken).delete(`/roles/${roleId}`).send();
      } catch (error) {
        // 忽略删除错误
      }
    }

    await app.close();
  });

  describe('POST /roles/:id/menus', () => {
    it('应该成功为角色分配菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds });

      expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(response.status);
      expect(response.body.data).toHaveProperty('id');
    });

    it('应该拒绝不存在的菜单ID', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds: [999999] });

      expect([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('应该拒绝空的菜单ID列表', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds: [] });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝不存在的角色ID', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/roles/999999/menus')
        .send({ menuIds });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /roles/:id/menus', () => {
    beforeAll(async () => {
      // 先为角色分配菜单
      await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds });
    });

    it('应该返回角色的菜单列表', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        `/roles/${roleId}/menus`,
      );

      expect(response.status).toBe(HttpStatus.OK);
      expect(Array.isArray(response.body.data)).toBe(true);
      // 验证菜单数量
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('应该拒绝不存在的角色ID', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get(
        '/roles/999999/menus',
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /roles/:id/menus', () => {
    beforeAll(async () => {
      // 先为角色分配菜单
      await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds });
    });

    it('应该成功移除角色的菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .delete(`/roles/${roleId}/menus`)
        .send({ menuIds: [menuIds[0]] });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.data).toHaveProperty('id');
    });

    it('应该拒绝空的菜单ID列表', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .delete(`/roles/${roleId}/menus`)
        .send({ menuIds: [] });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('完整的菜单授权流程', () => {
    it('应该完成: 创建菜单 -> 分配给角色 -> 查询角色菜单 -> 移除菜单 的完整流程', async () => {
      // 1. 创建新菜单
      const menuData = {
        name: '完整流程测试菜单',
        path: `/full-flow-test-${Date.now()}`,
        type: 'menu',
        sort: 100,
      };

      const createMenuResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createMenuResponse.status);
      const newMenuId = createMenuResponse.body.data.id;

      // 2. 分配菜单给角色
      const assignResponse = await authenticatedRequest(app, credentials.accessToken)
        .post(`/roles/${roleId}/menus`)
        .send({ menuIds: [newMenuId] });

      expect([HttpStatus.OK, HttpStatus.CREATED]).toContain(assignResponse.status);

      // 3. 查询角色的菜单,验证菜单已分配
      const getMenusResponse = await authenticatedRequest(app, credentials.accessToken).get(
        `/roles/${roleId}/menus`,
      );

      expect(getMenusResponse.status).toBe(HttpStatus.OK);
      const roleMenus = getMenusResponse.body.data;
      expect(Array.isArray(roleMenus)).toBe(true);
      const hasMenu = roleMenus.some((m: any) => m.id === newMenuId);
      expect(hasMenu).toBe(true);

      // 4. 移除菜单
      const revokeResponse = await authenticatedRequest(app, credentials.accessToken)
        .delete(`/roles/${roleId}/menus`)
        .send({ menuIds: [newMenuId] });

      expect(revokeResponse.status).toBe(HttpStatus.OK);

      // 5. 验证菜单已移除
      const getMenusAfterRemove = await authenticatedRequest(app, credentials.accessToken).get(
        `/roles/${roleId}/menus`,
      );

      expect(getMenusAfterRemove.status).toBe(HttpStatus.OK);
      const remainingMenus = getMenusAfterRemove.body.data;
      const stillHasMenu = remainingMenus.some((m: any) => m.id === newMenuId);
      expect(stillHasMenu).toBe(false);

      // 6. 清理：删除测试菜单
      const deleteResponse = await authenticatedRequest(app, credentials.accessToken).delete(
        `/menus/${newMenuId}`,
      );

      expect(deleteResponse.status).toBe(HttpStatus.OK);
    });
  });
});
