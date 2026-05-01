import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA, INTERCEPTORS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenApiController } from './open-api.controller';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';
import { OpenApiUserService } from '../services/open-api-user.service';
import { ApiAuthService } from '~/modules/api-auth/services/api-auth.service';
import { API_KEY_SCOPES_KEY, ApiKeyGuard } from '~/modules/api-auth/guards/api-key.guard';
import {
  OPEN_API_CONTROLLER_KEY,
  OPEN_API_ENDPOINT_KEY,
} from '~/modules/api-auth/constants/api-scopes.constant';
import { IS_PUBLIC_KEY } from '~/core/decorators/public.decorator';
import { ApiAccessLogInterceptor } from '~/modules/api-auth/interceptors/api-access-log.interceptor';

describe('OpenApiController', () => {
  let controller: OpenApiController;
  let openApiUserService: jest.Mocked<OpenApiUserService>;

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
          provide: OpenApiUserService,
          useValue: {
            getUsers: jest.fn(),
          },
        },
        {
          provide: ApiAuthService,
          useValue: {
            recordAccessLog: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(OpenApiController);
    openApiUserService = module.get(OpenApiUserService);
  });

  it('does not hardcode URI version in controller path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OpenApiController)).toBe('open');
  });

  it('uses the dedicated OpenAPI controller boundary decorator', () => {
    expect(Reflect.getMetadata(OPEN_API_CONTROLLER_KEY, OpenApiController)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, OpenApiController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, OpenApiController)).toContain(ApiKeyGuard);
    expect(Reflect.getMetadata(INTERCEPTORS_METADATA, OpenApiController)).toContain(
      ApiAccessLogInterceptor,
    );
  });

  it('documents the users endpoint through OpenApiEndpoint metadata', () => {
    const handler = OpenApiController.prototype.getUsers;

    expect(Reflect.getMetadata(API_KEY_SCOPES_KEY, handler)).toEqual(['read:users']);
    expect(Reflect.getMetadata(OPEN_API_ENDPOINT_KEY, handler)).toEqual(
      expect.objectContaining({
        scope: 'read:users',
        label: '读取用户公开资料',
        group: { key: 'open-user', title: '用户公开资料' },
        summary: '获取用户公开资料列表',
      }),
    );
  });

  it('returns real users from UserService without password fields', async () => {
    openApiUserService.getUsers.mockResolvedValue(
      OpenUserListResponseDto.fromResult(
        {
          items: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@local.home',
              realName: 'Admin',
              status: 'active',
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
        },
        req.user,
      ),
    );

    const result = await controller.getUsers({ page: 1, pageSize: 10 }, req as any);

    expect(result).toBeInstanceOf(OpenUserListResponseDto);
    expect(openApiUserService.getUsers).toHaveBeenCalledWith(
      { page: 1, pageSize: 10 },
      { id: 1, name: 'Mini Program' },
    );
    expect(result.data).toEqual([
      {
        id: 1,
        username: 'admin',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    expect(result.pagination.total).toBe(1);
  });

  it('uses a dedicated response dto instead of inline response shaping', () => {
    const source = readFileSync(join(__dirname, 'open-api.controller.ts'), 'utf8');

    expect(source).toContain('OpenUserListResponseDto');
    expect(source).toContain('OpenApiUserService');
    expect(source).not.toContain("from '~/modules/user/services/user.service'");
    expect(source).not.toContain('findUsers(');
  });
});
