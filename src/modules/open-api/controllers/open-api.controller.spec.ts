import { Test, TestingModule } from '@nestjs/testing';
import { OpenApiController } from './open-api.controller';

describe('OpenApiController', () => {
  let controller: OpenApiController;

  // Mock请求对象
  const createMockRequest = (overrides = {}) => ({
    user: {
      id: 1,
      name: 'Test App',
      scopes: ['read:users', 'read:orders'],
      totalCalls: 100,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
      lastCalledAt: new Date(),
      ...overrides,
    },
    headers: {},
    ip: '127.0.0.1',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenApiController],
    }).compile();

    controller = module.get<OpenApiController>(OpenApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('应该返回用户列表', async () => {
      const mockReq = createMockRequest();
      const result = await controller.getUsers(1, 10, mockReq);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toMatchObject({
        total: 100,
        page: 1,
        pageSize: 10,
      });
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('应该使用默认分页参数', async () => {
      const mockReq = createMockRequest();
      const result = await controller.getUsers(undefined, undefined, mockReq);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
    });
  });

  describe('getOrders', () => {
    it('应该根据权限返回不同级别的订单数据', async () => {
      const mockReqBasic = createMockRequest({
        scopes: ['read:orders'],
      });

      const result = await controller.getOrders({}, mockReqBasic);

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].amount).toBeNull(); // 无完整权限时敏感信息为null
    });

    it('应该返回完整信息给有完整权限的应用', async () => {
      const mockReqFull = createMockRequest({
        scopes: ['read:orders', 'read:orders:full'],
      });

      const result = await controller.getOrders({}, mockReqFull);

      expect(result.data[0].amount).toBeDefined();
      expect(result.data[0].customer).toBeDefined();
    });
  });

  describe('createOrder', () => {
    it('应该成功创建订单', async () => {
      const mockReq = createMockRequest({
        scopes: ['write:orders'],
      });

      const orderDto = {
        productId: 'PROD-001',
        quantity: 2,
        customerEmail: 'test@example.com',
      };

      const result = await controller.createOrder(orderDto, mockReq);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        ...orderDto,
        createdByApp: 'Test App',
        createdByAppId: 1,
      });
      expect(result.data.id).toMatch(/^ORDER-/);
    });

    it('应该记录创建者信息', async () => {
      const mockReq = createMockRequest({
        id: 999,
        name: 'Custom App',
      });

      const result = await controller.createOrder({}, mockReq);

      expect(result.data.createdByAppId).toBe(999);
      expect(result.data.createdByApp).toBe('Custom App');
    });
  });

  describe('subscribeWebhook', () => {
    it('应该成功订阅Webhook', async () => {
      const mockReq = createMockRequest({
        scopes: ['manage:webhooks'],
        webhookUrl: 'https://example.com/webhook',
      });

      const webhookData = {
        event: 'order.created',
        url: 'https://custom.com/webhook',
      };

      const result = await controller.subscribeWebhook(webhookData, mockReq);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        appId: 1,
        event: 'order.created',
        url: 'https://custom.com/webhook',
      });
      expect(result.data.id).toMatch(/^SUB-/);
    });

    it('应该使用应用默认webhook URL', async () => {
      const mockReq = createMockRequest({
        scopes: ['manage:webhooks'],
        webhookUrl: 'https://default.com/webhook',
      });

      const webhookData = {
        event: 'order.created',
        url: undefined,
      };

      const result = await controller.subscribeWebhook(webhookData, mockReq);

      expect(result.data.url).toBe('https://default.com/webhook');
    });
  });

  describe('getStatistics', () => {
    it('应该返回应用的统计信息', async () => {
      const mockReq = createMockRequest({
        name: 'My App',
        totalCalls: 12345,
        rateLimitPerHour: 500,
        rateLimitPerDay: 5000,
        lastCalledAt: new Date('2024-01-01'),
      });

      const result = await controller.getStatistics(mockReq);

      expect(result).toMatchObject({
        appName: 'My App',
        totalCalls: 12345,
        rateLimits: {
          perHour: 500,
          perDay: 5000,
        },
      });
      expect(result.lastCalledAt).toEqual(new Date('2024-01-01'));
    });

    it('应该处理未调用过的应用', async () => {
      const mockReq = createMockRequest({
        totalCalls: 0,
        lastCalledAt: null,
      });

      const result = await controller.getStatistics(mockReq);

      expect(result.totalCalls).toBe(0);
      expect(result.lastCalledAt).toBeNull();
    });
  });
});
