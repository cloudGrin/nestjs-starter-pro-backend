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
  let menuRepository: jest.Mocked<Repository<MenuEntity>>;
  let cacheService: jest.Mocked<CacheService>;

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
    menuRepository = module.get(getRepositoryToken(MenuEntity));
    cacheService = module.get(CacheService);
  });

  it('does not persist permissionIds as a role entity field during create', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
    });

    roleRepository.createQueryBuilder.mockReturnValue(qb as any);
    roleRepository.create.mockReturnValue(role);
    roleRepository.save.mockResolvedValue(role);

    await service.createRole({
      code: 'editor',
      name: '编辑',
      permissionIds: [1],
    } as any);

    expect(roleRepository.create).toHaveBeenCalledWith({
      code: 'editor',
      name: '编辑',
      isSystem: false,
    });
    expect(permissionRepository.find).not.toHaveBeenCalled();
    expect(roleRepository.create.mock.calls[0][0]).not.toHaveProperty('permissionIds');
  });

  it('checks soft-deleted rows before creating duplicate role code', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };

    roleRepository.createQueryBuilder.mockReturnValue(qb as any);

    await expect(
      service.createRole({
        code: 'editor',
        name: '编辑',
      } as any),
    ).rejects.toThrow('角色编码已存在');
    expect(qb.withDeleted).toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('does not persist permissionIds as a role entity field during update', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      name: '编辑',
      isSystem: false,
      permissions: [],
    });

    roleRepository.findOne.mockResolvedValue(role);
    roleRepository.save.mockImplementation(async (entity) => entity as RoleEntity);

    await service.updateRole(1, { name: '编辑员', permissionIds: [2] } as any);

    const savedRole = roleRepository.save.mock.calls[0][0];
    expect(permissionRepository.find).not.toHaveBeenCalled();
    expect(savedRole).toMatchObject({ name: '编辑员', permissions: [] });
    expect(savedRole).not.toHaveProperty('permissionIds');
  });

  it('rejects updating super_admin even when legacy data is not marked as system', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'super_admin',
      name: '超级管理员',
      isSystem: false,
      permissions: [],
    });

    roleRepository.findOne.mockResolvedValue(role);

    await expect(service.updateRole(1, { name: '改名' } as any)).rejects.toThrow(
      '超级管理员角色不能修改',
    );
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('allows assigning an empty permission list to clear role permissions', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      isSystem: false,
      permissions: [{ id: 1 }],
    });

    roleRepository.findOne.mockResolvedValue(role);
    roleRepository.save.mockImplementation(async (entity) => entity as RoleEntity);

    const result = await service.assignPermissions(1, []);

    expect(permissionRepository.find).not.toHaveBeenCalled();
    expect(result.permissions).toEqual([]);
    expect(roleRepository.save).toHaveBeenCalledWith(expect.objectContaining({ permissions: [] }));
  });

  it('rejects assigning permissions to super_admin because it owns all permissions by default', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'super_admin',
      isSystem: false,
      permissions: [],
    });

    roleRepository.findOne.mockResolvedValue(role);

    await expect(service.assignPermissions(1, [1])).rejects.toThrow('超级管理员角色权限不能修改');
    expect(permissionRepository.find).not.toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('rejects assigning menus to super_admin because it owns all menus by default', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'super_admin',
      isSystem: false,
      menus: [],
    });

    roleRepository.findOne.mockResolvedValue(role);

    await expect(service.assignMenus(1, [1])).rejects.toThrow('超级管理员角色菜单不能修改');
    expect(menuRepository.find).not.toHaveBeenCalled();
    expect(roleRepository.save).not.toHaveBeenCalled();
  });

  it('returns role access ids for the unified authorization modal', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      isSystem: false,
      permissions: [{ id: 11 }, { id: 12 }],
      menus: [{ id: 21 }, { id: 22 }],
    });

    roleRepository.findOne.mockResolvedValue(role);

    await expect(service.getRoleAccess(1)).resolves.toEqual({
      permissionIds: [11, 12],
      menuIds: [21, 22],
    });
    expect(roleRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['permissions', 'menus'],
    });
  });

  it('assigns menus and permissions together and clears user permission cache', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      isSystem: false,
      permissions: [],
      menus: [],
    });
    const permission = Object.assign(new PermissionEntity(), { id: 11, isActive: true });
    const menu = Object.assign(new MenuEntity(), { id: 21, isActive: true });

    roleRepository.findOne.mockResolvedValue(role);
    permissionRepository.find.mockResolvedValue([permission]);
    menuRepository.find.mockResolvedValue([menu]);
    roleRepository.save.mockImplementation(async (entity) => entity as RoleEntity);

    const result = await service.assignAccess(1, {
      permissionIds: [11],
      menuIds: [21],
    });

    expect(result.permissions).toEqual([permission]);
    expect(result.menus).toEqual([menu]);
    expect(roleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: [permission],
        menus: [menu],
      }),
    );
    expect(cacheService.delByPattern).toHaveBeenCalledWith('user:permissions:*');
  });

  it('allows clearing menus and permissions together', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      isSystem: false,
      permissions: [{ id: 11 }],
      menus: [{ id: 21 }],
    });

    roleRepository.findOne.mockResolvedValue(role);
    roleRepository.save.mockImplementation(async (entity) => entity as RoleEntity);

    const result = await service.assignAccess(1, {
      permissionIds: [],
      menuIds: [],
    });

    expect(permissionRepository.find).not.toHaveBeenCalled();
    expect(menuRepository.find).not.toHaveBeenCalled();
    expect(result.permissions).toEqual([]);
    expect(result.menus).toEqual([]);
    expect(cacheService.delByPattern).toHaveBeenCalledWith('user:permissions:*');
  });

  it('does not partially save unified access when any selected menu is invalid', async () => {
    const role = Object.assign(new RoleEntity(), {
      id: 1,
      code: 'editor',
      isSystem: false,
      permissions: [],
      menus: [],
    });
    const permission = Object.assign(new PermissionEntity(), { id: 11, isActive: true });

    roleRepository.findOne.mockResolvedValue(role);
    permissionRepository.find.mockResolvedValue([permission]);
    menuRepository.find.mockResolvedValue([]);

    await expect(
      service.assignAccess(1, {
        permissionIds: [11],
        menuIds: [21],
      }),
    ).rejects.toThrow('部分菜单不存在或已禁用');
    expect(roleRepository.save).not.toHaveBeenCalled();
    expect(cacheService.delByPattern).not.toHaveBeenCalled();
  });
});
