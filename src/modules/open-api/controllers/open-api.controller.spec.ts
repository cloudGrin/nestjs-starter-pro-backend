import { Test, TestingModule } from '@nestjs/testing';
import { OpenApiController } from './open-api.controller';
import { UserService } from '~/modules/user/services/user.service';
import { ApiAuthService } from '~/modules/api-auth/services/api-auth.service';

describe('OpenApiController', () => {
  let controller: OpenApiController;
  let userService: jest.Mocked<UserService>;
  let apiAuthService: jest.Mocked<ApiAuthService>;

  const req = {
    user: {
      id: 1,
      name: 'Mini Program',
      scopes: ['read:users'],
      type: 'api-app',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenApiController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findUsers: jest.fn(),
          },
        },
        {
          provide: ApiAuthService,
          useValue: {
            getApp: jest.fn(),
            getApiStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(OpenApiController);
    userService = module.get(UserService);
    apiAuthService = module.get(ApiAuthService);
  });

  it('returns real users from UserService without password fields', async () => {
    userService.findUsers.mockResolvedValue({
      items: [
        {
          id: 1,
          username: 'admin',
          email: 'admin@local.home',
          password: 'secret',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        } as any,
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      },
    });

    const result = await controller.getUsers({ page: 1, pageSize: 10 }, req as any);

    expect(userService.findUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.data).toEqual([
      {
        id: 1,
        username: 'admin',
        email: 'admin@local.home',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    expect(result.pagination.total).toBe(1);
  });

  it('returns real API app statistics for current API app', async () => {
    apiAuthService.getApp.mockResolvedValue({
      id: 1,
      name: 'Mini Program',
      totalCalls: 12,
      rateLimitPerHour: 100,
      rateLimitPerDay: 1000,
      lastCalledAt: new Date('2026-01-02T00:00:00.000Z'),
    } as any);
    apiAuthService.getApiStatistics.mockResolvedValue([
      { endpoint: '/v1/open/users', count: '12' },
    ]);

    const result = await controller.getStatistics(req as any);

    expect(apiAuthService.getApp).toHaveBeenCalledWith(1);
    expect(apiAuthService.getApiStatistics).toHaveBeenCalledWith(1, 'day');
    expect(result.appName).toBe('Mini Program');
    expect(result.totalCalls).toBe(12);
    expect(result.endpoints).toEqual([{ endpoint: '/v1/open/users', count: '12' }]);
  });
});
