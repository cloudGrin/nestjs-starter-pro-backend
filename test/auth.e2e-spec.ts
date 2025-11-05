/**
 * 认证模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  registerTestUser,
  generateTestUsername,
  generateTestEmail,
  authenticatedRequest,
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

  describe('POST /auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
        realName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user).toMatchObject({
        username: userData.username,
        email: userData.email,
        realName: userData.realName,
      });
    });

    it('应该拒绝重复的用户名', async () => {
      const username = generateTestUsername();
      const userData = {
        username,
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      // 第一次注册应该成功
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.CREATED);

      // 第二次注册应该失败（409 Conflict 更准确）
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...userData,
          email: generateTestEmail(), // 使用不同的邮箱
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('应该拒绝重复的邮箱', async () => {
      const email = generateTestEmail();
      const userData = {
        username: generateTestUsername(),
        email,
        password: 'Test@123456',
      };

      // 第一次注册应该成功
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.CREATED);

      // 第二次注册应该失败（409 Conflict 更准确）
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...userData,
          username: generateTestUsername(), // 使用不同的用户名
        })
        .expect(HttpStatus.CONFLICT);
    });

    it('应该拒绝无效的用户名格式', async () => {
      const userData = {
        username: 'invalid username!@#', // 包含非法字符
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝过短的用户名', async () => {
      const userData = {
        username: 'ab', // 小于3个字符
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝无效的邮箱格式', async () => {
      const userData = {
        username: generateTestUsername(),
        email: 'invalid-email', // 无效的邮箱格式
        password: 'Test@123456',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝弱密码', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'weak', // 不符合密码复杂度要求
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝缺少大写字母的密码', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'test@123456', // 缺少大写字母
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝缺少小写字母的密码', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'TEST@123456', // 缺少小写字母
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝缺少数字的密码', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@Password', // 缺少数字
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/login', () => {
    let testUser: {
      username: string;
      email: string;
      password: string;
    };

    beforeAll(async () => {
      // 创建一个测试用户用于登录测试
      testUser = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      await registerTestUser(app, testUser);
    });

    it('应该使用用户名成功登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: testUser.password,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.user).toMatchObject({
        username: testUser.username,
        email: testUser.email,
      });
    });

    it('应该使用邮箱成功登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.email,
          password: testUser.password,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('应该拒绝错误的密码', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: 'WrongPassword@123',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝不存在的用户', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: 'nonexistent_user_12345',
          password: 'Test@123456',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝空用户名', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: '',
          password: 'Test@123456',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝空密码', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: testUser.username,
          password: '',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /auth/profile', () => {
    let credentials: TestCredentials;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      credentials = await registerTestUser(app, userData);
    });

    it('应该返回当前用户的信息', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/auth/profile')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: credentials.user.id,
        username: credentials.user.username,
        email: credentials.user.email,
      });
      expect(response.body.data).toHaveProperty('roles');
      expect(response.body.data).toHaveProperty('permissions');
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝无效的token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid_token_12345')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝格式错误的Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', credentials.accessToken) // 缺少 "Bearer " 前缀
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /auth/check', () => {
    let credentials: TestCredentials;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      credentials = await registerTestUser(app, userData);
    });

    it('应该确认用户已认证', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/auth/check')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        authenticated: true,
        user: {
          id: credentials.user.id,
          username: credentials.user.username,
          email: credentials.user.email,
        },
      });
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get('/auth/check')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    let credentials: TestCredentials;

    beforeAll(async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      credentials = await registerTestUser(app, userData);
    });

    it('应该使用refresh token获取新的access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: credentials.refreshToken,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      // refresh 端点直接返回 AuthTokens，不是包装在 tokens 里
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.accessToken).not.toBe(credentials.accessToken);
    });

    it('应该拒绝无效的refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid_refresh_token_12345',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝空的refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: '',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/logout', () => {
    it('应该成功登出', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const credentials = await registerTestUser(app, userData);

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/auth/logout')
        .send({
          refreshToken: credentials.refreshToken,
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('登出成功');

      // 注意：JWT access token 是无状态的，登出后仍然有效直到过期
      // logout 只撤销 refresh token，不撤销 access token
      // 验证 refresh token 已被撤销
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: credentials.refreshToken,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('应该拒绝未认证的登出请求', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('即使不提供refresh token也应该成功登出', async () => {
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
      };

      const credentials = await registerTestUser(app, userData);

      const response = await authenticatedRequest(app, credentials.accessToken)
        .post('/auth/logout')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });
  });

  describe('完整的认证流程', () => {
    it('应该完成注册 -> 登录 -> 访问受保护资源 -> 刷新token -> 登出的完整流程', async () => {
      // 1. 注册
      const userData = {
        username: generateTestUsername(),
        email: generateTestEmail(),
        password: 'Test@123456',
        realName: 'Integration Test User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(HttpStatus.CREATED);

      expect(registerResponse.body.success).toBe(true);
      // 适配新的API响应结构
      const data = registerResponse.body.data;
      const initialCredentials = {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        user: data.user,
      };

      // 2. 登出后重新登录
      await authenticatedRequest(app, initialCredentials.accessToken)
        .post('/auth/logout')
        .expect(HttpStatus.OK);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          account: userData.username,
          password: userData.password,
        })
        .expect(HttpStatus.OK);

      expect(loginResponse.body.success).toBe(true);
      // 适配新的API响应结构
      const loginData = loginResponse.body.data;
      const loginCredentials = {
        accessToken: loginData.tokens.accessToken,
        refreshToken: loginData.tokens.refreshToken,
        user: loginData.user,
      };

      // 3. 访问受保护的资源
      const profileResponse = await authenticatedRequest(app, loginCredentials.accessToken)
        .get('/auth/profile')
        .expect(HttpStatus.OK);

      expect(profileResponse.body.data.username).toBe(userData.username);

      // 4. 刷新token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginCredentials.refreshToken,
        })
        .expect(HttpStatus.OK);

      // refresh 端点直接返回 AuthTokens，不是包装在 tokens 里
      const refreshData = refreshResponse.body.data;
      const newCredentials = {
        accessToken: refreshData.accessToken,
        refreshToken: refreshData.refreshToken,
        user: loginCredentials.user, // refresh 不返回 user，使用原来的
      };
      expect(newCredentials.accessToken).not.toBe(loginCredentials.accessToken);

      // 5. 使用新token访问资源
      await authenticatedRequest(app, newCredentials.accessToken)
        .get('/auth/profile')
        .expect(HttpStatus.OK);

      // 6. 登出
      await authenticatedRequest(app, newCredentials.accessToken)
        .post('/auth/logout')
        .send({
          refreshToken: newCredentials.refreshToken,
        })
        .expect(HttpStatus.OK);

      // 7. 验证 refresh token 已被撤销（JWT access token 无状态，不能被撤销）
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: newCredentials.refreshToken,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
