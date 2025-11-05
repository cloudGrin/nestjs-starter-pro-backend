/**
 * Statistics 模块 E2E 测试
 */

import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  registerSuperAdmin,
  generateTestUsername,
  generateTestEmail,
  authenticatedRequest,
  TestCredentials,
} from './test-helper';

describe('Statistics 模块 (e2e)', () => {
  let app: INestApplication;
  let credentials: TestCredentials;

  beforeAll(async () => {
    app = await createTestApp();

    // 创建超级管理员用户用于测试
    credentials = await registerSuperAdmin(app, {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Test@123456',
      realName: 'Statistics Test Admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /statistics/user-growth', () => {
    it('应该返回用户增长统计（默认7天）', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('growth');
      expect(response.body.data).toHaveProperty('growthRate');
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data.length).toBeLessThanOrEqual(7);
    });

    it('应该接受自定义天数参数', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth?days=14')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeGreaterThan(0);
      expect(response.body.data.data.length).toBeLessThanOrEqual(14);
    });

    it('应该拒绝无效的天数参数（小于1）', async () => {
      await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth?days=0')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝无效的天数参数（大于365）', async () => {
      await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth?days=366')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('应该拒绝非整数的天数参数', async () => {
      await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth?days=7.5')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('数据点应该包含正确的字段', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/user-growth')
        .expect(HttpStatus.OK);

      const dataPoint = response.body.data.data[0];
      expect(dataPoint).toHaveProperty('date');
      expect(dataPoint).toHaveProperty('totalUsers');
      expect(dataPoint).toHaveProperty('activeUsers');
      expect(dataPoint).toHaveProperty('newUsers');
      expect(dataPoint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD 格式
      expect(typeof dataPoint.totalUsers).toBe('number');
      expect(typeof dataPoint.activeUsers).toBe('number');
      expect(typeof dataPoint.newUsers).toBe('number');
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get('/statistics/user-growth')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /statistics/role-distribution', () => {
    it('应该返回角色分布统计', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/role-distribution')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('角色分布数据应该包含正确的字段', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/role-distribution')
        .expect(HttpStatus.OK);

      if (response.body.data.data.length > 0) {
        const roleData = response.body.data.data[0];
        expect(roleData).toHaveProperty('roleCode');
        expect(roleData).toHaveProperty('roleName');
        expect(roleData).toHaveProperty('userCount');
        expect(roleData).toHaveProperty('percentage');
        expect(typeof roleData.roleCode).toBe('string');
        expect(typeof roleData.roleName).toBe('string');
        expect(typeof roleData.userCount).toBe('number');
        expect(typeof roleData.percentage).toBe('number');
      }
    });

    it('应该按用户数量降序排列', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/role-distribution')
        .expect(HttpStatus.OK);

      const roles = response.body.data.data;
      if (roles.length > 1) {
        for (let i = 0; i < roles.length - 1; i++) {
          expect(roles[i].userCount).toBeGreaterThanOrEqual(roles[i + 1].userCount);
        }
      }
    });

    it('百分比计算应该正确', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/role-distribution')
        .expect(HttpStatus.OK);

      const roles = response.body.data.data;
      const totalUsers = response.body.data.totalUsers;

      // 验证每个角色的百分比计算是否正确
      if (totalUsers > 0) {
        for (const role of roles) {
          const expectedPercentage = Number(((role.userCount / totalUsers) * 100).toFixed(2));
          expect(role.percentage).toBe(expectedPercentage);
        }
      }

      // 注意：由于一个用户可能拥有多个角色，所以百分比总和可能不等于100%
      // 我们只验证百分比总和不超过合理范围（每个用户最多5个角色的情况）
      const totalPercentage = roles.reduce(
        (sum: number, role: any) => sum + role.percentage,
        0,
      );
      expect(totalPercentage).toBeGreaterThanOrEqual(0);
      expect(totalPercentage).toBeLessThanOrEqual(500); // 假设最多平均5个角色/用户
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get('/statistics/role-distribution')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /statistics/overview', () => {
    it('应该返回Dashboard总览数据', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userGrowth');
      expect(response.body.data).toHaveProperty('roleDistribution');
      expect(response.body.data).toHaveProperty('overview');
    });

    it('userGrowth应该包含正确的数据', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      const { userGrowth } = response.body.data;
      expect(userGrowth).toHaveProperty('data');
      expect(userGrowth).toHaveProperty('totalUsers');
      expect(userGrowth).toHaveProperty('growth');
      expect(userGrowth).toHaveProperty('growthRate');
      expect(Array.isArray(userGrowth.data)).toBe(true);
    });

    it('roleDistribution应该包含正确的数据', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      const { roleDistribution } = response.body.data;
      expect(roleDistribution).toHaveProperty('data');
      expect(roleDistribution).toHaveProperty('totalUsers');
      expect(Array.isArray(roleDistribution.data)).toBe(true);
    });

    it('overview应该包含所有必需字段', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      const { overview } = response.body.data;
      expect(overview).toHaveProperty('totalUsers');
      expect(overview).toHaveProperty('activeUsers');
      expect(overview).toHaveProperty('totalRoles');
      expect(overview).toHaveProperty('totalMenus');
      expect(typeof overview.totalUsers).toBe('number');
      expect(typeof overview.activeUsers).toBe('number');
      expect(typeof overview.totalRoles).toBe('number');
      expect(typeof overview.totalMenus).toBe('number');
    });

    it('overview中的totalUsers应该与userGrowth一致', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      const { userGrowth, overview } = response.body.data;
      expect(overview.totalUsers).toBe(userGrowth.totalUsers);
    });

    it('overview中的totalRoles应该与roleDistribution的角色数量一致', async () => {
      const response = await authenticatedRequest(app, credentials.accessToken)
        .get('/statistics/overview')
        .expect(HttpStatus.OK);

      const { roleDistribution, overview } = response.body.data;
      expect(overview.totalRoles).toBe(roleDistribution.data.length);
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app.getHttpServer())
        .get('/statistics/overview')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('统计数据一致性检查', () => {
    it('user-growth和overview的totalUsers应该一致', async () => {
      const [growthResponse, overviewResponse] = await Promise.all([
        authenticatedRequest(app, credentials.accessToken)
          .get('/statistics/user-growth')
          .expect(HttpStatus.OK),
        authenticatedRequest(app, credentials.accessToken)
          .get('/statistics/overview')
          .expect(HttpStatus.OK),
      ]);

      expect(growthResponse.body.data.totalUsers).toBe(
        overviewResponse.body.data.userGrowth.totalUsers,
      );
    });

    it('role-distribution和overview的角色分布应该一致', async () => {
      const [distributionResponse, overviewResponse] = await Promise.all([
        authenticatedRequest(app, credentials.accessToken)
          .get('/statistics/role-distribution')
          .expect(HttpStatus.OK),
        authenticatedRequest(app, credentials.accessToken)
          .get('/statistics/overview')
          .expect(HttpStatus.OK),
      ]);

      expect(distributionResponse.body.data.totalUsers).toBe(
        overviewResponse.body.data.roleDistribution.totalUsers,
      );
      expect(distributionResponse.body.data.data.length).toBe(
        overviewResponse.body.data.roleDistribution.data.length,
      );
    });
  });
});
