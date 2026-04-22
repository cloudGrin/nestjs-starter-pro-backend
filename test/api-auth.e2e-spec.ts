/**
 * API认证模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  registerTestUser,
  generateTestUsername,
  TestCredentials,
} from './test-helper';

describe('API认证模块 (e2e)', () => {
  let app: INestApplication;
  let adminCredentials: TestCredentials;
  let testAppId: number;
  let testApiKey: string;

  beforeAll(async () => {
    app = await createTestApp();
    // 创建管理员用户用于测试
    const testUsername = generateTestUsername();
    adminCredentials = await registerTestUser(app, {
      username: testUsername,
      email: `${testUsername}@example.com`,
      password: 'Test@123456',
    });
  });

  afterAll(async () => {
    await app.close();
  }, 60000); // 增加超时时间到60秒

  describe('POST /v1/api-apps - 创建API应用', () => {
    it('应该成功创建API应用', async () => {
      const appData = {
        name: `Test App ${Date.now()}`,
        description: 'E2E Test Application',
        scopes: ['read:users', 'read:statistics', 'read:orders'],
        rateLimitPerHour: 500,
        rateLimitPerDay: 5000,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/api-apps')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send(appData)
        .expect(HttpStatus.CREATED);

      expect(response.body.data).toMatchObject({
        name: appData.name,
        description: appData.description,
        scopes: appData.scopes,
        isActive: true,
      });

      testAppId = response.body.data.id;
    });

    it('应该拒绝未认证的请求', async () => {
      const appData = {
        name: 'Unauthorized App',
      };

      await request(app.getHttpServer())
        .post('/v1/api-apps')
        .send(appData)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝重复的应用名', async () => {
      const appName = `Duplicate App ${Date.now()}`;

      // 第一次创建应该成功
      await request(app.getHttpServer())
        .post('/v1/api-apps')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({ name: appName })
        .expect(HttpStatus.CREATED);

      // 第二次创建应该失败
      await request(app.getHttpServer())
        .post('/v1/api-apps')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({ name: appName })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /v1/api-apps/:id/keys - 生成API密钥', () => {
    it('应该成功生成API密钥', async () => {
      const keyData = {
        name: 'Production Key',
        environment: 'production',
        scopes: ['read:users', 'read:statistics'],
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/api-apps/${testAppId}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send(keyData);

      expect(response.status).toBe(HttpStatus.CREATED);

      expect(response.body.data).toMatchObject({
        name: keyData.name,
        prefix: 'sk_live',
        scopes: keyData.scopes,
      });
      expect(response.body.data.key).toBeDefined();
      expect(response.body.data.key).toMatch(/^sk_live_/);
      expect(response.body.data.message).toContain('请立即复制');

      testApiKey = response.body.data.key;
    });

    it('应该拒绝为不存在的应用生成密钥', async () => {
      const keyData = {
        name: 'Test Key',
        environment: 'test',
      };

      await request(app.getHttpServer())
        .post('/v1/api-apps/999999/keys')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send(keyData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该在超过密钥数量限制时拒绝', async () => {
      // 创建5个密钥（已经有1个了，再创建4个）
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post(`/v1/api-apps/${testAppId}/keys`)
          .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
          .send({
            name: `Key ${i}`,
            environment: 'test',
          })
          .expect(HttpStatus.CREATED);
      }

      // 第6个应该失败
      await request(app.getHttpServer())
        .post(`/v1/api-apps/${testAppId}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({
          name: 'Key 6',
          environment: 'test',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/api-apps/:id/keys - 获取应用密钥列表', () => {
    it('应该返回应用的所有密钥（不包含原始密钥）', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/api-apps/${testAppId}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const firstKey = response.body.data[0];
      expect(firstKey).toHaveProperty('displayKey');
      expect(firstKey).not.toHaveProperty('key'); // 不应该返回原始密钥
      expect(firstKey.displayKey).toMatch(/\*\*\*\*/);
    });
  });

  describe('使用API密钥访问开放API', () => {
    it('应该允许使用有效的API密钥访问', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/open/users?page=1&pageSize=10')
        .set('X-API-Key', testApiKey)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该拒绝缺少API密钥的请求', async () => {
      await request(app.getHttpServer()).get('/v1/open/users').expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝无效的API密钥', async () => {
      await request(app.getHttpServer())
        .get('/v1/open/users')
        .set('X-API-Key', 'sk_live_invalid_key_123')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该在缺少所需权限时拒绝访问', async () => {
      // 尝试创建订单，但密钥只有read:users权限
      await request(app.getHttpServer())
        .post('/v1/open/orders')
        .set('X-API-Key', testApiKey)
        .send({
          productId: 'PROD-001',
          quantity: 2,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/open/statistics - 获取API统计', () => {
    it('应该返回应用的使用统计', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/open/statistics')
        .set('X-API-Key', testApiKey)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveProperty('appName');
      expect(response.body.data).toHaveProperty('rateLimits');
      expect(response.body.data.rateLimits).toHaveProperty('perHour');
      expect(response.body.data.rateLimits).toHaveProperty('perDay');
    });
  });

  describe('DELETE /v1/api-apps/keys/:id - 撤销API密钥', () => {
    let keyIdToRevoke: number;

    beforeAll(async () => {
      // 获取现有密钥列表，使用其中一个进行撤销测试（避免超过密钥数量限制）
      const response = await request(app.getHttpServer())
        .get(`/v1/api-apps/${testAppId}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .expect(HttpStatus.OK);

      // 使用第一个不是主测试密钥的密钥
      const keys = response.body.data;
      keyIdToRevoke = keys.find((k: any) => k.id !== keys[0].id)?.id || keys[1]?.id;
    });

    it('应该成功撤销密钥', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/v1/api-apps/keys/${keyIdToRevoke}`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });

    it('撤销后密钥应该无法使用', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/api-apps/${testAppId}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .expect(HttpStatus.OK);

      const revokedKey = response.body.data.find((k: any) => k.id === keyIdToRevoke);
      expect(revokedKey.isActive).toBe(false);
    });
  });

  describe('GET /v1/api-apps/:id/statistics - API使用统计', () => {
    it('应该返回详细的API调用统计', async () => {
      // 先进行几次API调用
      await request(app.getHttpServer()).get('/v1/open/users').set('X-API-Key', testApiKey);

      await request(app.getHttpServer()).get('/v1/open/users').set('X-API-Key', testApiKey);

      // 获取统计
      const response = await request(app.getHttpServer())
        .get(`/v1/api-apps/${testAppId}/statistics?period=hour`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .expect(HttpStatus.OK);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('限流测试', () => {
    let limitTestApp: number;
    let limitTestKey: string;

    beforeAll(async () => {
      // 创建一个限流很低的应用用于测试
      const appResponse = await request(app.getHttpServer())
        .post('/v1/api-apps')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({
          name: `Rate Limit Test ${Date.now()}`,
          scopes: ['read:users'], // 必须设置应用级别的scopes
          rateLimitPerHour: 3, // 每小时只允许3次
          rateLimitPerDay: 10,
        })
        .expect(HttpStatus.CREATED);

      limitTestApp = appResponse.body.data.id;

      const keyResponse = await request(app.getHttpServer())
        .post(`/v1/api-apps/${limitTestApp}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({
          name: 'Rate Limit Test Key',
          environment: 'test',
          scopes: ['read:users'],
        })
        .expect(HttpStatus.CREATED);

      limitTestKey = keyResponse.body.data.key;
    });

    it('应该在超过限流后拒绝请求', async () => {
      // 前3次应该成功
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .get('/v1/open/users')
          .set('X-API-Key', limitTestKey)
          .expect(HttpStatus.OK);
      }

      // 第4次应该被限流
      await request(app.getHttpServer())
        .get('/v1/open/users')
        .set('X-API-Key', limitTestKey)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('IP白名单测试', () => {
    let ipTestApp: number;
    let ipTestKey: string;

    beforeAll(async () => {
      // 创建一个配置了IP白名单的应用
      const appResponse = await request(app.getHttpServer())
        .post('/v1/api-apps')
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({
          name: `IP Whitelist Test ${Date.now()}`,
          ipWhitelist: ['192.168.1.1', '10.0.0.0/24'], // 限制特定IP
        })
        .expect(HttpStatus.CREATED);

      ipTestApp = appResponse.body.data.id;

      const keyResponse = await request(app.getHttpServer())
        .post(`/v1/api-apps/${ipTestApp}/keys`)
        .set('Authorization', `Bearer ${adminCredentials.accessToken}`)
        .send({
          name: 'IP Test Key',
          environment: 'test',
          scopes: ['read:users'],
        })
        .expect(HttpStatus.CREATED);

      ipTestKey = keyResponse.body.data.key;
    });

    it('应该拒绝不在白名单中的IP', async () => {
      // 测试环境的IP通常不会在配置的白名单中
      await request(app.getHttpServer())
        .get('/v1/open/users')
        .set('X-API-Key', ipTestKey)
        .expect(HttpStatus.FORBIDDEN); // 应该返回403 Forbidden
    });
  });
});
