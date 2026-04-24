import { Test, TestingModule } from '@nestjs/testing';
import { PATH_METADATA } from '@nestjs/common/constants';
import { OpenApiController } from './open-api.controller';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';
import { OpenApiUserService } from '../services/open-api-user.service';

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
      ],
    }).compile();

    controller = module.get(OpenApiController);
    openApiUserService = module.get(OpenApiUserService);
  });

  it('does not hardcode URI version in controller path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OpenApiController)).toBe('open');
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
        email: 'admin@local.home',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    expect(result.pagination.total).toBe(1);
  });

  it('uses a dedicated response dto instead of inline response shaping', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'open-api.controller.ts'), 'utf8');

    expect(source).toContain('OpenUserListResponseDto');
    expect(source).toContain('OpenApiUserService');
    expect(source).not.toContain("from '~/modules/user/services/user.service'");
    expect(source).not.toContain('findUsers(');
  });

});
