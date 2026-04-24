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
      menuRepository.create.mockReturnValue(mockMenu);
      menuRepository.save.mockResolvedValue(mockMenu);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockMenu);
      expect(menuRepository.create).toHaveBeenCalledWith(mockCreateDto);
      expect(menuRepository.save).toHaveBeenCalledWith(mockMenu);
      expect(logger.log).toHaveBeenCalledWith(`创建菜单: ${mockMenu.name}`);
    });

    it('当指定的父菜单不存在时应该抛出 NotFoundException', async () => {
      menuRepository.findOne.mockResolvedValue(null);

      await expect(service.create({ ...mockCreateDto, parentId: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应该成功更新菜单', async () => {
      const existingMenu = createMockMenu({ id: 1 });
      const dto: UpdateMenuDto = { name: '更新后的菜单', path: '/updated' };
      const updatedMenu = createMockMenu({ ...existingMenu, ...dto });

      menuRepository.findOne.mockResolvedValue(existingMenu);
      menuRepository.save.mockResolvedValue(updatedMenu);

      const result = await service.update(1, dto);

      expect(result).toEqual(updatedMenu);
      expect(menuRepository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
    });

    it('父菜单不能设置为自己', async () => {
      menuRepository.findOne.mockResolvedValue(createMockMenu({ id: 1 }));

      await expect(service.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
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
  });

  describe('moveMenu', () => {
    it('应该通过事务移动菜单', async () => {
      const menu = createMockMenu({ id: 1, parentId: 2 });
      const parent = createMockMenu({ id: 3, parentId: null });
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
  });
});
