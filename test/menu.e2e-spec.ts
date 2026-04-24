/**
 * 菜单模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createSuperAdminCredentials,
  authenticatedRequest,
  TestCredentials,
  generateTestUsername,
  generateTestEmail,
} from './test-helper';

describe('菜单模块 (e2e)', () => {
  let app: INestApplication;
  let credentials: TestCredentials;
  const createdMenuIds: number[] = [];

  beforeAll(async () => {
    app = await createTestApp();

    // 创建测试用户并登录
    const userData = {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Test@123456',
    };

    credentials = await createSuperAdminCredentials(app, userData);
  });

  afterAll(async () => {
    // 清理创建的测试菜单
    for (const id of createdMenuIds) {
      try {
        await authenticatedRequest(app, credentials.accessToken).delete(`/menus/${id}`).send();
      } catch {
        // 忽略删除错误
      }
    }

    await app.close();
  });

  describe('POST /menus', () => {
    it('应该成功创建菜单', async () => {
      const menuData = {
        name: '测试菜单',
        path: '/test',
        type: 'menu',
        icon: 'test-icon',
        sort: 1,
        isVisible: true,
        isActive: true,
      };

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: menuData.name,
        path: menuData.path,
        type: menuData.type,
      });
      expect(response.body.data).toHaveProperty('id');

      createdMenuIds.push(response.body.data.id);
    });

    it('应该成功创建带父菜单的子菜单', async () => {
      // 先创建父菜单
      const parentMenuData = {
        name: '父菜单',
        path: '/parent',
        type: 'directory',
        sort: 1,
      };

      const parentResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(parentMenuData)
        .expect(HttpStatus.CREATED);

      const parentId = parentResponse.body.data.id;
      createdMenuIds.push(parentId);

      // 创建子菜单
      const childMenuData = {
        name: '子菜单',
        path: '/parent/child',
        type: 'menu',
        parentId,
        sort: 1,
      };

      const childResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(childMenuData)
        .expect(HttpStatus.CREATED);

      expect(childResponse.body.data.parentId).toBe(parentId);
      createdMenuIds.push(childResponse.body.data.id);
    });

    it('应该拒绝不存在的父菜单ID', async () => {
      const menuData = {
        name: '无效父菜单测试',
        path: '/invalid-parent',
        type: 'menu',
        parentId: 999999, // 不存在的ID
        sort: 1,
      };

      await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /menus', () => {
    it('应该返回菜单列表', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken).get('/menus');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /menus/tree', () => {
    it('应该返回菜单树', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/tree')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /menus/user-menus', () => {
    it('应该返回当前用户的菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/user-menus')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer()).get('/menus/user-menus').expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /menus/:id', () => {
    let menuId: number;

    beforeAll(async () => {
      const menuData = {
        name: '详情测试菜单',
        path: '/detail-test',
        type: 'menu',
        sort: 1,
      };

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      menuId = response.body.data.id;
      createdMenuIds.push(menuId);
    });

    it('应该返回菜单详情', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get(`/menus/${menuId}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(menuId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('path');
    });

    it('应该返回404如果菜单不存在', async () => {
      await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/999999')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('PUT /menus/:id', () => {
    let menuId: number;

    beforeAll(async () => {
      const menuData = {
        name: '更新测试菜单',
        path: '/update-test',
        type: 'menu',
        sort: 1,
      };

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      menuId = response.body.data.id;
      createdMenuIds.push(menuId);
    });

    it('应该成功更新菜单', async () => {
      const updateData = {
        name: '已更新的菜单名称',
        sort: 10,
      };

      const response = await authenticatedRequest(app, credentials.accessToken)
        .put(`/menus/${menuId}`)
        .send(updateData)
        .expect(HttpStatus.OK);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.sort).toBe(updateData.sort);
    });

    it('应该拒绝将父菜单设置为自己', async () => {
      const updateData = {
        parentId: menuId, // 不能设为自己
      };

      await authenticatedRequest(app, credentials.accessToken)
        .put(`/menus/${menuId}`)
        .send(updateData)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /menus/:id/move', () => {
    let menuId: number;
    let targetParentId: number;

    beforeAll(async () => {
      // 创建目标父菜单
      const parentData = {
        name: '移动目标父菜单',
        path: '/move-target',
        type: 'directory',
        sort: 1,
      };

      const parentResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(parentData)
        .expect(HttpStatus.CREATED);

      targetParentId = parentResponse.body.data.id;
      createdMenuIds.push(targetParentId);

      // 创建要移动的菜单
      const menuData = {
        name: '待移动菜单',
        path: '/to-move',
        type: 'menu',
        sort: 1,
      };

      const menuResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      menuId = menuResponse.body.data.id;
      createdMenuIds.push(menuId);
    });

    it('应该成功移动菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .patch(`/menus/${menuId}/move`)
        .send({ targetParentId })
        .expect(HttpStatus.OK);
      expect(response.body.data.parentId).toBe(targetParentId);
    });

    it('应该拒绝形成循环依赖的移动', async () => {
      // 尝试将父菜单移动到子菜单下（会形成循环）
      await authenticatedRequest(app, credentials.accessToken)
        .patch(`/menus/${targetParentId}/move`)
        .send({ targetParentId: menuId })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /menus/batch-status', () => {
    let menuIds: number[];

    beforeAll(async () => {
      menuIds = [];
      // 创建多个测试菜单
      for (let i = 0; i < 3; i++) {
        const menuData = {
          name: `批量测试菜单${i}`,
          path: `/batch-test-${i}`,
          type: 'menu',
          sort: i,
        };

        const response = await authenticatedRequest(app, credentials.accessToken)
          .post('/menus')
          .send(menuData)
          .expect(HttpStatus.CREATED);

        menuIds.push(response.body.data.id);
        createdMenuIds.push(response.body.data.id);
      }
    });

    it('应该成功批量禁用菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .patch('/menus/batch-status')
        .send({
          menuIds,
          isActive: false,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });

    it('应该成功批量启用菜单', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .patch('/menus/batch-status')
        .send({
          menuIds,
          isActive: true,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /menus/validate-path', () => {
    let existingMenuId: number;
    const existingPath = '/validate-test-path';

    beforeAll(async () => {
      const menuData = {
        name: '路径验证测试',
        path: existingPath,
        type: 'menu',
        sort: 1,
      };

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      existingMenuId = response.body.data.id;
      createdMenuIds.push(existingMenuId);
    });

    it('应该验证路径不存在', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/validate-path')
        .query({ path: '/new-unique-path' })
        .expect(HttpStatus.OK);

      expect(response.body.data.isUnique).toBe(true);
    });

    it('应该验证路径已存在', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/validate-path')
        .query({ path: existingPath })
        .expect(HttpStatus.OK);

      expect(response.body.data.isUnique).toBe(false);
    });

    it('应该排除当前菜单ID进行验证', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/menus/validate-path')
        .query({ path: existingPath, excludeId: existingMenuId })
        .expect(HttpStatus.OK);

      expect(response.body.data.isUnique).toBe(true);
    });
  });

  describe('DELETE /menus/:id', () => {
    it('应该成功删除菜单', async () => {
      // 创建一个临时菜单用于删除
      const menuData = {
        name: '待删除菜单',
        path: '/to-delete',
        type: 'menu',
        sort: 1,
      };

      const createResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(menuData)
        .expect(HttpStatus.CREATED);

      const menuId = createResponse.body.data.id;

      // 删除菜单
      await authenticatedRequest(app, credentials.accessToken)
        .delete(`/menus/${menuId}`)
        .expect(HttpStatus.OK);

      // 验证已删除
      await authenticatedRequest(app, credentials.accessToken)
        .get(`/menus/${menuId}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('应该拒绝删除有子菜单的菜单', async () => {
      // 创建父菜单
      const parentData = {
        name: '有子菜单的父菜单',
        path: '/parent-with-child',
        type: 'directory',
        sort: 1,
      };

      const parentResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(parentData)
        .expect(HttpStatus.CREATED);

      const parentId = parentResponse.body.data.id;
      createdMenuIds.push(parentId);

      // 创建子菜单
      const childData = {
        name: '子菜单',
        path: '/parent-with-child/child',
        type: 'menu',
        parentId,
        sort: 1,
      };

      const childResponse = await authenticatedRequest(app, credentials.accessToken)
        .post('/menus')
        .send(childData)
        .expect(HttpStatus.CREATED);

      createdMenuIds.push(childResponse.body.data.id);

      // 尝试删除父菜单应该失败
      await authenticatedRequest(app, credentials.accessToken)
        .delete(`/menus/${parentId}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
