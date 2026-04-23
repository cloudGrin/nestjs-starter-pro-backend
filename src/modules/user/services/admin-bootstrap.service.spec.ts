import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UserStatus } from '~/common/enums/user.enum';
import { LoggerService } from '~/shared/logger/logger.service';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { RoleCategory, RoleEntity } from '~/modules/role/entities/role.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';
import { UserEntity } from '../entities/user.entity';
import { AdminBootstrapService } from './admin-bootstrap.service';

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let roleRepository: jest.Mocked<Repository<RoleEntity>>;
  let menuRepository: jest.Mocked<Repository<MenuEntity>>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const userRepositoryMock = {
      ...createMockRepository<UserEntity>(),
      count: jest.fn(),
    };
    const menuRepositoryMock = {
      ...createMockRepository<MenuEntity>(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminBootstrapService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryMock,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: createMockRepository<RoleEntity>(),
        },
        {
          provide: getRepositoryToken(MenuEntity),
          useValue: menuRepositoryMock,
        },
        {
          provide: LoggerService,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get(AdminBootstrapService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    menuRepository = module.get(getRepositoryToken(MenuEntity));
    logger = module.get(LoggerService);
  });

  it('空库启动时创建 admin 超级管理员并只在日志输出随机密码', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'super_admin',
      name: '超级管理员',
      category: RoleCategory.SYSTEM,
      isActive: true,
      isSystem: true,
    });
    const user = Object.assign(new UserEntity(), {
      id: 1,
      username: 'admin',
      email: 'admin@local.home',
      status: UserStatus.ACTIVE,
      roles: [role],
    });

    userRepository.count.mockResolvedValue(0);
    roleRepository.findOne.mockResolvedValue(null);
    roleRepository.create.mockReturnValue(role);
    roleRepository.save.mockResolvedValue(role);
    menuRepository.count.mockResolvedValue(0);
    menuRepository.create.mockImplementation((data) => data as MenuEntity);
    menuRepository.save.mockImplementation(async (data) => data as MenuEntity);
    userRepository.create.mockImplementation((data) => Object.assign(user, data));
    userRepository.save.mockResolvedValue(user);

    await service.onApplicationBootstrap();

    expect(userRepository.count).toHaveBeenCalledWith({ withDeleted: true });
    expect(roleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'super_admin',
        category: RoleCategory.SYSTEM,
        isSystem: true,
      }),
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'admin',
        email: 'admin@local.home',
        status: UserStatus.ACTIVE,
        roles: [role],
      }),
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        password: expect.stringMatching(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{16,}$/),
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Initial admin account'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('username: admin'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('password: '));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('shown only once'));
    expect(menuRepository.count).toHaveBeenCalled();
    expect(menuRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: '系统管理',
          path: '/system',
        }),
      ]),
    );
  });

  it('已有用户时跳过初始化且不输出密码', async () => {
    userRepository.count.mockResolvedValue(1);

    await service.onApplicationBootstrap();

    expect(userRepository.count).toHaveBeenCalledWith({ withDeleted: true });
    expect(roleRepository.findOne).not.toHaveBeenCalled();
    expect(roleRepository.create).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('password: '));
  });
});
