import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  apiPath,
  authenticatedRequest,
  createSuperAdminCredentials,
  createTestApp,
  createTestUserCredentials,
  generateTestEmail,
  generateTestUsername,
  TestCredentials,
} from './test-helper';

describe('自动化任务模块 (e2e)', () => {
  let app: INestApplication;
  let adminCredentials: TestCredentials;
  let normalUserCredentials: TestCredentials;

  beforeAll(async () => {
    app = await createTestApp();
    adminCredentials = await createSuperAdminCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Admin@123456',
      realName: '自动化任务测试管理员',
    });
    normalUserCredentials = await createTestUserCredentials(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'User@123456',
      realName: '自动化任务测试普通用户',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('拒绝未认证用户访问自动化任务列表', async () => {
    await request(app.getHttpServer())
      .get(apiPath('/automation/tasks'))
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('超级管理员可以读取任务列表、更新配置、手动执行并查看日志', async () => {
    const listResponse = await authenticatedRequest(app, adminCredentials.accessToken)
      .get('/automation/tasks')
      .expect(HttpStatus.OK);

    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'cleanupExpiredRefreshTokens',
          config: expect.objectContaining({
            taskKey: 'cleanupExpiredRefreshTokens',
          }),
        }),
        expect.objectContaining({
          key: 'sendTaskReminders',
        }),
      ]),
    );

    const updateResponse = await authenticatedRequest(app, adminCredentials.accessToken)
      .put('/automation/tasks/cleanupExpiredRefreshTokens/config')
      .send({
        enabled: false,
        cronExpression: '0 4 * * *',
        params: {},
      })
      .expect(HttpStatus.OK);

    expect(updateResponse.body.data).toMatchObject({
      taskKey: 'cleanupExpiredRefreshTokens',
      enabled: false,
      cronExpression: '0 4 * * *',
      params: {},
    });

    const runResponse = await authenticatedRequest(app, adminCredentials.accessToken)
      .post('/automation/tasks/cleanupExpiredRefreshTokens/run')
      .expect(HttpStatus.OK);

    expect(runResponse.body.data).toMatchObject({
      taskKey: 'cleanupExpiredRefreshTokens',
      triggerType: 'manual',
      status: 'success',
    });

    const logsResponse = await authenticatedRequest(app, adminCredentials.accessToken)
      .get('/automation/tasks/cleanupExpiredRefreshTokens/logs')
      .expect(HttpStatus.OK);

    expect(logsResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          taskKey: 'cleanupExpiredRefreshTokens',
          triggerType: 'manual',
        }),
      ]),
    );
  });

  it('普通用户不能更新配置或手动执行任务', async () => {
    await authenticatedRequest(app, normalUserCredentials.accessToken)
      .put('/automation/tasks/cleanupExpiredRefreshTokens/config')
      .send({ enabled: true })
      .expect(HttpStatus.FORBIDDEN);

    await authenticatedRequest(app, normalUserCredentials.accessToken)
      .post('/automation/tasks/cleanupExpiredRefreshTokens/run')
      .expect(HttpStatus.FORBIDDEN);
  });
});
