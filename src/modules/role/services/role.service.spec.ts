import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleService } from './role.service';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { createMockCacheService, createMockLogger, createMockRepository } from '~/test-utils';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: jest.Mocked<Repository<RoleEntity>>;
  let permissionRepository: jest.Mocked<Repository<PermissionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(RoleEntity), useValue: createMockRepository<RoleEntity>() },
        {
          provide: getRepositoryToken(PermissionEntity),
          useValue: createMockRepository<PermissionEntity>(),
        },
        { provide: getRepositoryToken(MenuEntity), useValue: createMockRepository<MenuEntity>() },
        { provide: LoggerService, useValue: createMockLogger() },
        { provide: CacheService, useValue: createMockCacheService() },
      ],
    }).compile();

    service = module.get(RoleService);
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    permissionRepository = module.get(getRepositoryToken(PermissionEntity));
  });

  it('does not persist permissionIds as a role entity field during create', async () => {
    const qb = { where: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) };
    const permission = Object.assign(new PermissionEntity(), { id: 1, isActive: true });
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      permissions: [permission],
    });

    roleRepository.createQueryBuilder.mockReturnValue(qb as any);
    permissionRepository.find.mockResolvedValue([permission]);
    roleRepository.create.mockReturnValue(role);
    roleRepository.save.mockResolvedValue(role);

    await service.createRole({
      code: 'editor',
      name: '编辑',
      permissionIds: [1],
    });

    expect(roleRepository.create).toHaveBeenCalledWith({
      code: 'editor',
      name: '编辑',
      permissions: [permission],
      isSystem: false,
    });
    expect(roleRepository.create.mock.calls[0][0]).not.toHaveProperty('permissionIds');
  });

  it('does not persist permissionIds as a role entity field during update', async () => {
    const permission = Object.assign(new PermissionEntity(), { id: 2, isActive: true });
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      name: '编辑',
      isSystem: false,
      permissions: [],
    });

    roleRepository.findOne.mockResolvedValue(role);
    permissionRepository.find.mockResolvedValue([permission]);
    roleRepository.save.mockImplementation(async (entity) => entity as RoleEntity);

    await service.updateRole(1, { name: '编辑员', permissionIds: [2] });

    const savedRole = roleRepository.save.mock.calls[0][0];
    expect(savedRole).toMatchObject({ name: '编辑员', permissions: [permission] });
    expect(savedRole).not.toHaveProperty('permissionIds');
  });
});
