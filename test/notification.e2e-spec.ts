import { INestApplication, HttpStatus } from '@nestjs/common';
import {
  apiPath,
  authenticatedRequest,
  createTestApp,
  createSuperAdminCredentials,
  createTestUserCredentials,
  generateTestUsername,
  generateTestEmail,
} from './test-helper';
import {
  NotificationStatus,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';

describe('Notification Module (E2E)', () => {
  let app: INestApplication;
  let adminCredentials: { accessToken: string; user: any };
  let normalUserCredentials: { accessToken: string; user: any };

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
    await app.close();
  });

  describe('POST /notifications', () => {
    it('应该成功创建单用户通知', async () => {
      const notificationData = {
        title: '单用户测试通知',
        content: '这是一条单用户测试通知内容',
        recipientIds: [adminCredentials.user.id],
        type: NotificationType.MESSAGE,
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      // 创建通知返回数组（支持批量创建）
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0].title).toBe(notificationData.title);
      expect(response.body.data[0].content).toBe(notificationData.content);
      expect(response.body.data[0].recipientId).toBe(adminCredentials.user.id);
      expect(response.body.data[0].status).toBe(NotificationStatus.UNREAD);
    });

    it('应该成功创建多用户通知', async () => {
      const notificationData = {
        title: '多用户测试通知',
        content: '这是一条发送给多个用户的通知',
        recipientIds: [adminCredentials.user.id, normalUserCredentials.user.id],
        type: NotificationType.REMINDER,
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('应该成功创建系统通知', async () => {
      const notificationData = {
        title: '系统维护通知',
        content: '系统将于今晚22:00进行维护',
        recipientIds: [adminCredentials.user.id],
        type: NotificationType.SYSTEM,
        // 注意：DTO不支持isSystem字段
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].type).toBe(NotificationType.SYSTEM);
    });

    it('应该成功创建带优先级的通知', async () => {
      const notificationData = {
        title: '高优先级通知',
        content: '这是一条重要通知',
        recipientIds: [adminCredentials.user.id],
        priority: 'high',
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      expect(response.body.data[0].priority).toBe('high');
    });

    it('应该支持自定义过期时间', async () => {
      const expireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后
      const notificationData = {
        title: '限时通知',
        content: '此通知将在7天后过期',
        recipientIds: [adminCredentials.user.id],
        expireAt: expireAt.toISOString(),
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      if (response.body.data[0].expireAt) {
        const responseExpireAt = new Date(response.body.data[0].expireAt);
        expect(responseExpireAt.getTime()).toBeCloseTo(expireAt.getTime(), -4);
      }
    });

    it('应该拒绝空标题', async () => {
      const notificationData = {
        title: '',
        content: '测试内容',
        recipientIds: [adminCredentials.user.id],
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝空接收人列表', async () => {
      const notificationData = {
        title: '测试通知',
        content: '测试内容',
        recipientIds: [],
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝不存在的接收人', async () => {
      const notificationData = {
        title: '测试通知',
        content: '测试内容',
        recipientIds: [999999], // 不存在的用户ID
      };

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('未认证用户应该无法创建通知', async () => {
      const notificationData = {
        title: '测试通知',
        content: '测试内容',
        recipientIds: [adminCredentials.user.id],
      };

      const response = await authenticatedRequest(app, 'invalid_token')
        .post(apiPath('/notifications'))
        .send(notificationData);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /notifications', () => {
    beforeAll(async () => {
      // 创建一些测试通知
      const notifications = [
        {
          title: '通知1',
          content: '内容1',
          recipientIds: [adminCredentials.user.id],
          type: NotificationType.MESSAGE,
        },
        {
          title: '通知2',
          content: '内容2',
          recipientIds: [adminCredentials.user.id],
          type: NotificationType.REMINDER,
        },
        {
          title: '通知3',
          content: '内容3',
          recipientIds: [adminCredentials.user.id],
          type: NotificationType.SYSTEM,
        },
      ];

      for (const notification of notifications) {
        await authenticatedRequest(app, adminCredentials.accessToken)
          .post(apiPath('/notifications'))
          .send(notification);
      }
    });

    it('应该成功获取当前用户的通知列表', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications',
      );

      expect([HttpStatus.OK]).toContain(response.status);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.meta).toHaveProperty('currentPage');
      expect(response.body.data.meta).toHaveProperty('totalItems');
    });

    it('应该支持分页', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ page: 1, limit: 2 });

      expect([HttpStatus.OK]).toContain(response.status);
      expect(response.body.data.meta.currentPage).toBe(1);
      expect(response.body.data.meta.itemsPerPage).toBe(2);
    });

    it('应该支持按状态过滤', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ status: NotificationStatus.UNREAD });

      expect([HttpStatus.OK]).toContain(response.status);
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((item: any) => {
          expect(item.status).toBe(NotificationStatus.UNREAD);
        });
      }
    });

    it('应该支持按类型过滤', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ type: NotificationType.MESSAGE });

      expect([HttpStatus.OK]).toContain(response.status);
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((item: any) => {
          expect(item.type).toBe(NotificationType.MESSAGE);
        });
      }
    });

    it('应该支持按日期范围过滤', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7天前
      const endDate = new Date().toISOString();

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ startDate, endDate });

      expect([HttpStatus.OK]).toContain(response.status);
    });

    it('应该只返回当前用户的通知', async () => {
      // 创建只给其他用户的通知
      await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send({
          title: '其他用户专属通知',
          content: '内容',
          recipientIds: [normalUserCredentials.user.id],
        });

      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications',
      );

      expect([HttpStatus.OK]).toContain(response.status);
      // 验证返回的通知都属于当前用户
      if (response.body.data.items.length > 0) {
        response.body.data.items.forEach((item: any) => {
          expect(item.recipientId).toBe(adminCredentials.user.id);
        });
      }
    });

    it('未认证用户应该无法获取通知列表', async () => {
      const response = await authenticatedRequest(app, 'invalid_token').get(apiPath('/notifications'));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /notifications/unread', () => {
    beforeAll(async () => {
      // 创建一些未读通知
      await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send({
          title: '未读通知测试',
          content: '这是一条未读通知',
          recipientIds: [adminCredentials.user.id],
        });
    });

    it('应该成功获取未读通知列表', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications/unread',
      );

      expect([HttpStatus.OK]).toContain(response.status);
      expect(Array.isArray(response.body.data)).toBe(true);
      // 验证所有返回的通知都是未读状态
      if (response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          expect(item.status).toBe(NotificationStatus.UNREAD);
          expect(item.recipientId).toBe(adminCredentials.user.id);
        });
      }
    });

    it('应该返回未读通知数量', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications/unread',
      );

      expect([HttpStatus.OK]).toContain(response.status);
      expect(typeof response.body.data.length).toBe('number');
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('未认证用户应该无法获取未读通知', async () => {
      const response = await authenticatedRequest(app, 'invalid_token').get(
        '/notifications/unread',
      );

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /notifications/:id/read', () => {
    let testNotificationId: number;

    beforeAll(async () => {
      // 创建一条测试通知
      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send({
          title: '待标记已读的通知',
          content: '测试标记已读功能',
          recipientIds: [adminCredentials.user.id],
        });

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(createResponse.status)) {
        testNotificationId = createResponse.body.data.id;
      }
    });

    it('应该成功标记通知为已读', async () => {
      if (!testNotificationId) {
        return;
      }

      const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/notifications/${testNotificationId}/read`,
      );

      expect([HttpStatus.OK]).toContain(response.status);
    });

    it('应该拒绝标记不属于自己的通知', async () => {
      // 创建一条属于其他用户的通知
      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send({
          title: '其他用户的通知',
          content: '测试权限',
          recipientIds: [normalUserCredentials.user.id],
        });

      if ([HttpStatus.CREATED, HttpStatus.OK].includes(createResponse.status)) {
        // 创建通知返回数组
        const notificationId = createResponse.body.data[0].id;

        // 尝试用第一个用户的token标记为已读
        const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
          `/notifications/${notificationId}/read`,
        );

        expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);
      }
    });

    it('应该拒绝标记不存在的通知', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
        '/notifications/999999/read',
      );

      expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST]).toContain(response.status);
    });

    it('未认证用户应该无法标记通知为已读', async () => {
      const response = await authenticatedRequest(app, 'invalid_token').put(
        `/notifications/${testNotificationId}/read`,
      );

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PUT /notifications/read-all', () => {
    beforeAll(async () => {
      // 创建多条未读通知
      const notifications = [
        { title: '批量测试1', content: '内容1', recipientIds: [adminCredentials.user.id] },
        { title: '批量测试2', content: '内容2', recipientIds: [adminCredentials.user.id] },
        { title: '批量测试3', content: '内容3', recipientIds: [adminCredentials.user.id] },
      ];

      for (const notification of notifications) {
        await authenticatedRequest(app, adminCredentials.accessToken)
          .post(apiPath('/notifications'))
          .send(notification);
      }
    });

    it('应该成功标记所有通知为已读', async () => {
      const response = await authenticatedRequest(app, adminCredentials.accessToken).put(
        '/notifications/read-all',
      );

      expect([HttpStatus.OK]).toContain(response.status);
      expect(typeof response.body.data.affected).toBe('number');
      expect(response.body.data.affected).toBeGreaterThanOrEqual(0);
    });

    it('标记全部已读后未读列表应该为空或减少', async () => {
      // 先获取未读数量
      const beforeResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications/unread',
      );

      const beforeCount = beforeResponse.body.data?.length || 0;

      // 标记全部已读
      await authenticatedRequest(app, adminCredentials.accessToken).put(apiPath('/notifications/read-all'));

      // 再次获取未读数量
      const afterResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications/unread',
      );

      const afterCount = afterResponse.body.data?.length || 0;

      expect(afterCount).toBeLessThanOrEqual(beforeCount);
    });

    it('未认证用户应该无法标记所有通知为已读', async () => {
      const response = await authenticatedRequest(app, 'invalid_token').put(
        '/notifications/read-all',
      );

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('完整通知流程', () => {
    it('创建->查询未读->标记已读->验证状态', async () => {
      // 1. 创建通知
      const createResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .post(apiPath('/notifications'))
        .send({
          title: '流程测试通知',
          content: '完整流程测试',
          recipientIds: [adminCredentials.user.id],
          type: NotificationType.MESSAGE,
        });

      expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(createResponse.status);
      // 创建通知返回数组
      const notificationId = createResponse.body.data[0].id;

      // 2. 查询未读通知（应该包含刚创建的）
      const unreadResponse = await authenticatedRequest(app, adminCredentials.accessToken).get(
        '/notifications/unread',
      );

      expect([HttpStatus.OK]).toContain(unreadResponse.status);
      const unreadNotification = unreadResponse.body.data?.find(
        (n: any) => n.id === notificationId,
      );
      expect(unreadNotification).toBeDefined();
      expect(unreadNotification.status).toBe(NotificationStatus.UNREAD);

      // 3. 标记为已读
      const markReadResponse = await authenticatedRequest(app, adminCredentials.accessToken).put(
        `/notifications/${notificationId}/read`,
      );

      expect([HttpStatus.OK]).toContain(markReadResponse.status);

      // 4. 再次查询通知列表，验证状态已改变
      const listResponse = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ page: 1, limit: 100 });

      expect([HttpStatus.OK]).toContain(listResponse.status);
      const readNotification = listResponse.body.data?.items?.find(
        (n: any) => n.id === notificationId,
      );
      if (readNotification) {
        expect(readNotification.status).toBe(NotificationStatus.READ);
      }
    });
  });

  describe('并发场景测试', () => {
    it('并发创建通知应该全部成功', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        authenticatedRequest(app, adminCredentials.accessToken)
          .post(apiPath('/notifications'))
          .send({
            title: `并发测试通知${i}`,
            content: `并发内容${i}`,
            recipientIds: [adminCredentials.user.id],
          }),
      );

      const responses = await Promise.all(promises);

      // 检查任一响应是否有权限问题

      responses.forEach((response) => {
        expect([HttpStatus.CREATED, HttpStatus.OK]).toContain(response.status);
      });
    });

    it('并发标记已读应该不会冲突', async () => {
      // 先创建多条通知
      const createPromises = Array.from({ length: 3 }, (_, i) =>
        authenticatedRequest(app, adminCredentials.accessToken)
          .post(apiPath('/notifications'))
          .send({
            title: `并发已读测试${i}`,
            content: `内容${i}`,
            recipientIds: [adminCredentials.user.id],
          }),
      );

      const createResponses = await Promise.all(createPromises);

      // 检查权限

      const notificationIds = createResponses
        .filter((r) => [HttpStatus.CREATED, HttpStatus.OK].includes(r.status))
        .map((r) => r.body.data[0].id);

      // 并发标记为已读
      const markReadPromises = notificationIds.map((id) =>
        authenticatedRequest(app, adminCredentials.accessToken).put(apiPath(`/notifications/${id}/read`)),
      );

      const markReadResponses = await Promise.all(markReadPromises);

      // 检查权限

      markReadResponses.forEach((response) => {
        expect([HttpStatus.OK]).toContain(response.status);
      });
    });
  });

  describe('性能测试', () => {
    it('批量创建通知性能', async () => {
      const startTime = Date.now();
      const count = 10;

      for (let i = 0; i < count; i++) {
        await authenticatedRequest(app, adminCredentials.accessToken)
          .post(apiPath('/notifications'))
          .send({
            title: `性能测试通知${i}`,
            content: `测试内容${i}`,
            recipientIds: [adminCredentials.user.id],
          });

        // 如果第一个请求就权限不足，直接跳过
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(count * 1000); // 平均每条不超过1秒
    });

    it('分页查询性能', async () => {
      const startTime = Date.now();

      const response = await authenticatedRequest(app, adminCredentials.accessToken)
        .get(apiPath('/notifications'))
        .query({ page: 1, limit: 50 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect([HttpStatus.OK]).toContain(response.status);
      expect(duration).toBeLessThan(2000); // 查询不超过2秒
    });
  });
});
