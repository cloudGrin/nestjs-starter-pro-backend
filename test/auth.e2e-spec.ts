/**
 * 认证模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  apiPath,
  authenticatedRequest,
  createTestApp,
  createTestUserCredentials,
  generateTestEmail,
  generateTestUsername,
  TestCredentials,
} from './test-helper';

describe('认证模块 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    let testUser: { username: string; email: string; password: string };

    beforeAll(async () => {
      testUser = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      await createTestUserCredentials(app, testUser);
    });

    it('应该使用用户名成功登录', async () => {
      const response = await request(app.getHttpServer())
        .post(apiPath('/auth/login'))
        .send({ account: testUser.username, password: testUser.password })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('应该使用邮箱成功登录', async () => {
      const response = await request(app.getHttpServer())
        .post(apiPath('/auth/login'))
        .send({ account: testUser.email, password: testUser.password })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('应该拒绝错误凭证', async () => {
      await request(app.getHttpServer())
        .post(apiPath('/auth/login'))
        .send({ account: testUser.username, password: 'WrongPassword@123' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    let credentials: TestCredentials;

    beforeAll(async () => {
      credentials = await createTestUserCredentials(app, {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      });
    });

    it('应该使用 refresh token 获取新的 access token', async () => {
      const response = await request(app.getHttpServer())
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: credentials.refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('应该拒绝无效 refresh token', async () => {
      await request(app.getHttpServer())
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: 'invalid_refresh_token_12345' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/logout', () => {
    it('应该撤销 refresh token', async () => {
      const credentials = await createTestUserCredentials(app, {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      });

      await authenticatedRequest(app, credentials.accessToken)
        .post(apiPath('/auth/logout'))
        .send({ refreshToken: credentials.refreshToken })
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post(apiPath('/auth/refresh'))
        .send({ refreshToken: credentials.refreshToken })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
