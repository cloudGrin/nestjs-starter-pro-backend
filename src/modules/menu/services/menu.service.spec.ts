import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { MenuService } from './menu.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { MenuEntity, MenuType } from '../entities/menu.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from '../dto';
import { createMockRepository, createMockLogger } from '~/test-utils';

describe('MenuService', () => {
  let service: MenuService;
  let menuRepository: jest.Mocked<Repository<MenuEntity>>;
  let roleRepository: jest.Mocked<Repository<RoleEntity>>;
  let logger: jest.Mocked<LoggerService>;

  const createMockMenu = (overrides?: Partial<MenuEntity>): MenuEntity => {
    const menu = new MenuEntity();
    menu.id = faker.number.int({ min: 1, max: 1000 });
    menu.name = faker.lorem.words(2);
    menu.path = `/${faker.lorem.slug()}`;
    menu.type = MenuType.MENU;
    menu.component = `views/${faker.lorem.slug()}/index`;
    menu.icon = faker.lorem.word();
    menu.sort = faker.number.int({ min: 0, max: 100 });
    menu.isVisible = true;
    menu.isActive = true;
    menu.isExternal = false;
    menu.isCache = false;
    menu.createdAt = new Date();
    menu.updatedAt = new Date();
    menu.children = [];
    return Object.assign(menu, overrides);
  };

  beforeEach(async () => {
    const mockMenuRepository = createMockRepository<MenuEntity>();
    const mockRoleRepository = createMockRepository<RoleEntity>();
    const mockLogger = createMockLogger();

    (mockMenuRepository as any).manager = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(MenuEntity), useValue: mockMenuRepository },
        { provide: getRepositoryToken(RoleEntity), useValue: mockRoleRepository },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(MenuService);
    menuRepository = module.get(getRepositoryToken(MenuEntity));
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateDto: CreateMenuDto = {
      name: '测试菜单',
      path: '/test',
      type: MenuType.MENU,
      component: 'views/test/index',
      icon: 'test-icon',
      sort: 1,
      isVisible: true,
      isActive: true,
    };

    it('应该成功创建菜单', async () => {
      const mockMenu = createMockMenu(mockCreateDto);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);
      menuRepository.create.mockReturnValue(mockMenu);
      menuRepository.save.mockResolvedValue(mockMenu);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockMenu);
      expect(menuRepository.create).toHaveBeenCalledWith(mockCreateDto);
      expect(menuRepository.save).toHaveBeenCalledWith(mockMenu);
      expect(logger.log).toHaveBeenCalledWith(`创建菜单: ${mockMenu.name}`);
    });

    it('创建菜单时拒绝重复路径', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);

      await expect(service.create(mockCreateDto)).rejects.toThrow(BadRequestException);
      expect(menuRepository.save).not.toHaveBeenCalled();
    });

    it('当指定的父菜单不存在时应该抛出 NotFoundException', async () => {
      menuRepository.findOne.mockResolvedValue(null);

      await expect(service.create({ ...mockCreateDto, parentId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('父级不是目录时应该拒绝创建子菜单', async () => {
      const parentMenu = createMockMenu({ id: 2, type: MenuType.MENU });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };
      menuRepository.findOne.mockResolvedValue(parentMenu);
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);
      menuRepository.create.mockReturnValue(createMockMenu({ ...mockCreateDto, parentId: 2 }));

      await expect(service.create({ ...mockCreateDto, parentId: 2 })).rejects.toThrow(
        BadRequestException,
      );
      expect(menuRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('应该成功更新菜单', async () => {
      const existingMenu = createMockMenu({ id: 1 });
      const dto: UpdateMenuDto = { name: '更新后的菜单', path: '/updated' };
      const updatedMenu = createMockMenu({ ...existingMenu, ...dto });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      menuRepository.findOne.mockResolvedValue(existingMenu);
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);
      menuRepository.save.mockResolvedValue(updatedMenu);

      const result = await service.update(1, dto);

      expect(result).toEqual(updatedMenu);
      expect(menuRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
    });

    it('父菜单不能设置为自己', async () => {
      menuRepository.findOne.mockResolvedValue(createMockMenu({ id: 1 }));

      await expect(service.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
    });

    it('更新菜单时拒绝重复路径', async () => {
      const existingMenu = createMockMenu({ id: 1, path: '/old' });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };

      menuRepository.findOne.mockResolvedValue(existingMenu);
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);

      await expect(service.update(1, { path: '/duplicated' })).rejects.toThrow(BadRequestException);
      expect(menuRepository.save).not.toHaveBeenCalled();
    });

    it('父级不是目录时应该拒绝更新父菜单', async () => {
      const existingMenu = createMockMenu({ id: 1, parentId: null });
      const parentMenu = createMockMenu({ id: 2, type: MenuType.MENU, parentId: null });
      menuRepository.findOne
        .mockResolvedValueOnce(existingMenu)
        .mockResolvedValueOnce(parentMenu)
        .mockResolvedValueOnce(parentMenu);

      await expect(service.update(1, { parentId: 2 })).rejects.toThrow(BadRequestException);
      expect(menuRepository.save).not.toHaveBeenCalled();
    });

    it('存在子菜单时应该拒绝将目录改为菜单', async () => {
      const child = createMockMenu({ id: 2, parentId: 1 });
      const existingMenu = createMockMenu({
        id: 1,
        type: MenuType.DIRECTORY,
        parentId: null,
        children: [child],
      });
      menuRepository.findOne.mockResolvedValue(existingMenu);

      await expect(service.update(1, { type: MenuType.MENU })).rejects.toThrow(
        BadRequestException,
      );
      expect(menuRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('应该成功删除菜单', async () => {
      const mockMenu = createMockMenu({ id: 1 });
      menuRepository.findOne.mockResolvedValue(mockMenu);
      menuRepository.find.mockResolvedValue([]);
      menuRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.delete(1);

      expect(menuRepository.softDelete).toHaveBeenCalledWith(1);
      expect(menuRepository.find).toHaveBeenCalledWith({
        where: { parentId: 1 },
        order: { sort: 'ASC' },
      });
      expect(logger.log).toHaveBeenCalledWith(`删除菜单: ${mockMenu.name} (ID: 1)`);
    });

    it('存在子菜单时不能删除', async () => {
      menuRepository.findOne.mockResolvedValue(createMockMenu({ id: 1 }));
      menuRepository.find.mockResolvedValue([createMockMenu({ parentId: 1 })]);

      await expect(service.delete(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('应该成功查询菜单详情', async () => {
      const mockMenu = createMockMenu({ id: 1 });
      menuRepository.findOne.mockResolvedValue(mockMenu);

      const result = await service.findById(1);

      expect(result).toEqual(mockMenu);
      expect(menuRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['parent', 'children'],
      });
    });
  });

  describe('findAll', () => {
    it('应该按查询条件返回菜单列表', async () => {
      const menus = [createMockMenu(), createMockMenu()];
      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(menus),
      };
      menuRepository.createQueryBuilder.mockReturnValue(qb as any);

      const query: QueryMenuDto = { name: '测试' };
      const result = await service.findAll(query);

      expect(result).toEqual(menus);
      expect(menuRepository.createQueryBuilder).toHaveBeenCalledWith('menu');
    });
  });

  describe('getMenuTree', () => {
    it('应该返回菜单树结构', async () => {
      menuRepository.find.mockResolvedValue([
        createMockMenu({ id: 1, parentId: undefined }),
        createMockMenu({ id: 2, parentId: 1 }),
      ]);

      const result = await service.getMenuTree();

      expect(Array.isArray(result)).toBe(true);
      expect(menuRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sort: 'ASC' },
      });
    });
  });

  describe('getUserMenusByRoles', () => {
    it('super_admin 应该直接读取所有可见菜单', async () => {
      menuRepository.find.mockResolvedValue([
        createMockMenu({ id: 1, name: '用户管理', path: '/user', isVisible: true }),
      ]);

      const result = await service.getUserMenusByRoles(1, ['super_admin']);

      expect(menuRepository.find).toHaveBeenCalledWith({
        where: { isActive: true, isVisible: true },
        order: { sort: 'ASC' },
      });
      expect(result[0]).toHaveProperty('path', '/user');
    });

    it('应该基于角色返回用户菜单', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { code: 'editor', menus: [createMockMenu({ id: 1, path: '/user', isVisible: true })] },
          ]),
      };
      roleRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getUserMenusByRoles(1, ['editor']);

      expect(roleRepository.createQueryBuilder).toHaveBeenCalledWith('role');
      expect(result[0]).toHaveProperty('path', '/user');
    });

    it('无角色时直接返回空菜单，避免生成空 IN 查询', async () => {
      const result = await service.getUserMenusByRoles(1, []);

      expect(result).toEqual([]);
      expect(roleRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('按菜单ID去重，避免多个角色共享菜单时重复返回', async () => {
      const duplicatedA = createMockMenu({ id: 1, parentId: null, path: '/dashboard' });
      const duplicatedB = createMockMenu({ id: 1, parentId: null, path: '/dashboard' });
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { code: 'editor', menus: [duplicatedA] },
          { code: 'viewer', menus: [duplicatedB] },
        ]),
      };
      roleRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getUserMenusByRoles(1, ['editor', 'viewer']);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('path', '/dashboard');
    });

    it('补齐已授权子菜单的可见父级，避免树构建时丢失子菜单', async () => {
      const parent = createMockMenu({ id: 1, parentId: null, path: '/system', name: '系统' });
      const child = createMockMenu({ id: 2, parentId: 1, path: '/system/users', name: '用户' });
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ code: 'editor', menus: [child] }]),
      };
      roleRepository.createQueryBuilder.mockReturnValue(qb as any);
      menuRepository.findOne.mockResolvedValue(parent);

      const result = await service.getUserMenusByRoles(1, ['editor']);

      expect(menuRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, isActive: true, isVisible: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        path: '/system',
        children: [expect.objectContaining({ path: '/system/users' })],
      });
    });
  });

  describe('moveMenu', () => {
    it('应该通过事务移动菜单', async () => {
      const menu = createMockMenu({ id: 1, parentId: 2 });
      const parent = createMockMenu({ id: 3, parentId: null, type: MenuType.DIRECTORY });
      const transactionalRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(menu)
          .mockResolvedValueOnce(parent)
          .mockResolvedValueOnce(parent),
        save: jest.fn().mockImplementation(async (entity) => entity),
      };
      (menuRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({ getRepository: jest.fn().mockReturnValue(transactionalRepo) }),
      );

      const result = await service.moveMenu(1, 3);

      expect(result.parentId).toBe(3);
      expect(transactionalRepo.save).toHaveBeenCalledWith(expect.objectContaining({ parentId: 3 }));
    });

    it('目标父级不是目录时应该拒绝移动', async () => {
      const menu = createMockMenu({ id: 1, parentId: null });
      const targetParent = createMockMenu({ id: 2, parentId: null, type: MenuType.MENU });
      const transactionalRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(menu)
          .mockResolvedValueOnce(targetParent)
          .mockResolvedValueOnce(targetParent),
        save: jest.fn().mockImplementation(async (entity) => entity),
      };
      (menuRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({ getRepository: jest.fn().mockReturnValue(transactionalRepo) }),
      );

      await expect(service.moveMenu(1, 2)).rejects.toThrow(BadRequestException);
      expect(transactionalRepo.save).not.toHaveBeenCalled();
    });

    it('拖到同级目标节点后面时应该重排 sort', async () => {
      const movingMenu = createMockMenu({ id: 1, parentId: null, sort: 10 });
      const targetMenu = createMockMenu({ id: 2, parentId: null, sort: 20 });
      const nextMenu = createMockMenu({ id: 3, parentId: null, sort: 30 });
      const transactionalRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(movingMenu)
          .mockResolvedValueOnce(targetMenu),
        find: jest.fn().mockResolvedValue([movingMenu, targetMenu, nextMenu]),
        save: jest.fn().mockImplementation(async (entity) => entity),
      };
      (menuRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({ getRepository: jest.fn().mockReturnValue(transactionalRepo) }),
      );

      await service.moveMenu(1, null, { targetId: 2, position: 'after' });

      expect(transactionalRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 2, sort: 10 }),
        expect.objectContaining({ id: 1, sort: 20 }),
        expect.objectContaining({ id: 3, sort: 30 }),
      ]);
    });

    it('拖拽排序时应该拒绝将目标节点设置为自己', async () => {
      const movingMenu = createMockMenu({ id: 1, parentId: null, sort: 10 });
      const transactionalRepo = {
        findOne: jest.fn().mockResolvedValueOnce(movingMenu),
        find: jest.fn().mockResolvedValue([movingMenu]),
        save: jest.fn().mockImplementation(async (entity) => entity),
      };
      (menuRepository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
        callback({ getRepository: jest.fn().mockReturnValue(transactionalRepo) }),
      );

      await expect(service.moveMenu(1, null, { targetId: 1, position: 'before' })).rejects.toThrow(
        BadRequestException,
      );
      expect(transactionalRepo.find).not.toHaveBeenCalled();
      expect(transactionalRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('batchUpdateStatus', () => {
    it('rejects when some menu ids do not exist', async () => {
      menuRepository.count.mockResolvedValue(1);

      await expect(service.batchUpdateStatus([1, 2], false)).rejects.toThrow(BadRequestException);
      expect(menuRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
