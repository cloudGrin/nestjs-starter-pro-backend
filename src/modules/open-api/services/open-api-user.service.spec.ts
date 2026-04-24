import { Test, TestingModule } from '@nestjs/testing';
import { OpenApiUserService } from './open-api-user.service';
import { UserService } from '~/modules/user/services/user.service';
import { OpenUserListResponseDto } from '../dto/open-user-response.dto';

describe('OpenApiUserService', () => {
  let service: OpenApiUserService;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenApiUserService,
        {
          provide: UserService,
          useValue: {
            findUsers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OpenApiUserService);
    userService = module.get(UserService);
  });

  it('maps internal user list results into open api response dto', async () => {
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

    const result = await service.getUsers(
      { page: 1, pageSize: 10 },
      { id: 1, name: 'Mini Program' },
    );

    expect(result).toBeInstanceOf(OpenUserListResponseDto);
    expect(userService.findUsers).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result.data[0]).not.toHaveProperty('password');
    expect(result.app).toEqual({ id: 1, name: 'Mini Program' });
  });
});
