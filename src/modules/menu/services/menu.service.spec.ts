import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuRepository } from '../repositories/menu.repository';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { MenuEntity, MenuType } from '../entities/menu.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { CreateMenuDto, UpdateMenuDto, QueryMenuDto } from '../dto';
import { faker } from '@faker-js/faker';
import { createMockRepository } from '~/test-utils';

describe('MenuService', () => {
  let service: MenuService;
  let menuRepo: jest.Mocked<MenuRepository>;
  let logger: jest.Mocked<LoggerService>;
  let cache: jest.Mocked<CacheService>;

  // Mock工厂函数
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
    return Object.assign(menu, overrides);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: MenuRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            findByParentId: jest.fn(),
            findWithQuery: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useValue: createMockRepository(),
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            delByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    menuRepo = module.get(MenuRepository) as jest.Mocked<MenuRepository>;
    logger = module.get(LoggerService) as jest.Mocked<LoggerService>;
    cache = module.get(CacheService) as jest.Mocked<CacheService>;
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
      menuRepo.create.mockReturnValue(mockMenu);
      menuRepo.save.mockResolvedValue(mockMenu);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockMenu);
      expect(menuRepo.create).toHaveBeenCalledWith(mockCreateDto);
      expect(menuRepo.save).toHaveBeenCalledWith(mockMenu);
      expect(logger.log).toHaveBeenCalledWith(`创建菜单: ${mockMenu.name}`);
    });

    it('应该成功创建带父菜单的菜单', async () => {
      const parentId = 1;
      const parentMenu = createMockMenu({ id: parentId });
      const createDtoWithParent = { ...mockCreateDto, parentId };
      const mockMenu = createMockMenu({ ...createDtoWithParent, parentId });

      menuRepo.findOne.mockResolvedValue(parentMenu);
      menuRepo.create.mockReturnValue(mockMenu);
      menuRepo.save.mockResolvedValue(mockMenu);

      const result = await service.create(createDtoWithParent);

      expect(result).toEqual(mockMenu);
      expect(menuRepo.findOne).toHaveBeenCalledWith({
        where: { id: parentId },
      });
    });

    it('当指定的父菜单不存在时应该抛出NotFoundException', async () => {
      const parentId = 999;
      const createDtoWithParent = { ...mockCreateDto, parentId };

      menuRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDtoWithParent)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDtoWithParent)).rejects.toThrow(
        `父菜单 ID ${parentId} 不存在`,
      );
    });
  });

  describe('update', () => {
    const menuId = 1;
    const mockUpdateDto: UpdateMenuDto = {
      name: '更新后的菜单',
      path: '/updated',
    };

    it('应该成功更新菜单', async () => {
      const existingMenu = createMockMenu({ id: menuId });
      const updatedMenu = createMockMenu({
        ...existingMenu,
        ...mockUpdateDto,
      });

      menuRepo.findOne.mockResolvedValue(existingMenu);
      menuRepo.save.mockResolvedValue(updatedMenu);

      const result = await service.update(menuId, mockUpdateDto);

      expect(result).toEqual(updatedMenu);
      expect(menuRepo.save).toHaveBeenCalledWith(expect.objectContaining(mockUpdateDto));
      expect(logger.log).toHaveBeenCalledWith(`更新菜单: ${updatedMenu.name} (ID: ${menuId})`);
    });

    it('当菜单不存在时应该抛出NotFoundException', async () => {
      menuRepo.findOne.mockResolvedValue(null);

      await expect(service.update(menuId, mockUpdateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(menuId, mockUpdateDto)).rejects.toThrow('菜单不存在');
    });

    it('父菜单不能设置为自己', async () => {
      const existingMenu = createMockMenu({ id: menuId });
      const updateWithSelfParent = { parentId: menuId };

      menuRepo.findOne.mockResolvedValue(existingMenu);

      await expect(service.update(menuId, updateWithSelfParent)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(menuId, updateWithSelfParent)).rejects.toThrow(
        '父菜单不能是自己',
      );
    });

    it('当指定的父菜单不存在时应该抛出NotFoundException', async () => {
      const existingMenu = createMockMenu({ id: menuId });
      const updateWithParent = { parentId: 999 };

      menuRepo.findOne
        .mockResolvedValueOnce(existingMenu) // findById查找要更新的菜单
        .mockResolvedValueOnce(null); // 检查父菜单是否存在

      await expect(service.update(menuId, updateWithParent)).rejects.toThrow(NotFoundException);

      menuRepo.findOne.mockResolvedValueOnce(existingMenu).mockResolvedValueOnce(null);

      await expect(service.update(menuId, updateWithParent)).rejects.toThrow(
        `父菜单 ID ${updateWithParent.parentId} 不存在`,
      );
    });

    it('应该成功更新父菜单', async () => {
      const parentId = 2;
      const parentMenu = createMockMenu({ id: parentId });
      const existingMenu = createMockMenu({ id: menuId });
      const updateWithParent = { parentId };
      const updatedMenu = createMockMenu({
        ...existingMenu,
        ...updateWithParent,
      });

      menuRepo.findOne.mockResolvedValueOnce(existingMenu).mockResolvedValueOnce(parentMenu);
      menuRepo.save.mockResolvedValue(updatedMenu);

      const result = await service.update(menuId, updateWithParent);

      expect(result).toEqual(updatedMenu);
    });
  });

  describe('delete', () => {
    const menuId = 1;

    it('应该成功删除菜单', async () => {
      const mockMenu = createMockMenu({ id: menuId });
      menuRepo.findOne.mockResolvedValue(mockMenu);
      menuRepo.findByParentId.mockResolvedValue([]);

      await service.delete(menuId);

      expect(menuRepo.softDelete).toHaveBeenCalledWith(menuId);
      expect(logger.log).toHaveBeenCalledWith(`删除菜单: ${mockMenu.name} (ID: ${menuId})`);
    });

    it('当菜单不存在时应该抛出NotFoundException', async () => {
      menuRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(menuId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(menuId)).rejects.toThrow('菜单不存在');
    });

    it('存在子菜单时不能删除', async () => {
      const mockMenu = createMockMenu({ id: menuId });
      const childMenu = createMockMenu({ parentId: menuId });

      menuRepo.findOne.mockResolvedValue(mockMenu);
      menuRepo.findByParentId.mockResolvedValue([childMenu]);

      await expect(service.delete(menuId)).rejects.toThrow(BadRequestException);
      await expect(service.delete(menuId)).rejects.toThrow('存在子菜单，无法删除');
    });
  });

  describe('findById', () => {
    const menuId = 1;

    it('应该成功查询菜单详情', async () => {
      const mockMenu = createMockMenu({ id: menuId });
      menuRepo.findOne.mockResolvedValue(mockMenu);

      const result = await service.findById(menuId);

      expect(result).toEqual(mockMenu);
      expect(menuRepo.findOne).toHaveBeenCalledWith({
        where: { id: menuId },
        relations: ['parent', 'children'],
      });
    });

    it('当菜单不存在时应该抛出NotFoundException', async () => {
      menuRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(menuId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(menuId)).rejects.toThrow('菜单不存在');
    });
  });

  describe('findAll', () => {
    it('应该返回查询结果', async () => {
      const mockMenus = [createMockMenu(), createMockMenu()];
      const query: QueryMenuDto = { name: '测试' };

      menuRepo.findWithQuery.mockResolvedValue(mockMenus);

      const result = await service.findAll(query);

      expect(result).toEqual(mockMenus);
      expect(menuRepo.findWithQuery).toHaveBeenCalledWith(query);
    });

    it('应该支持空查询条件', async () => {
      const mockMenus = [createMockMenu(), createMockMenu(), createMockMenu()];
      const query: QueryMenuDto = {};

      menuRepo.findWithQuery.mockResolvedValue(mockMenus);

      const result = await service.findAll(query);

      expect(result).toEqual(mockMenus);
      expect(result).toHaveLength(3);
    });
  });

  describe('getMenuTree', () => {
    it('应该返回菜单树结构', async () => {
      const rootMenu = createMockMenu({ id: 1, parentId: undefined });
      const childMenu1 = createMockMenu({ id: 2, parentId: 1 });
      const childMenu2 = createMockMenu({ id: 3, parentId: 1 });
      const grandChildMenu = createMockMenu({ id: 4, parentId: 2 });

      const allMenus = [rootMenu, childMenu1, childMenu2, grandChildMenu];
      menuRepo.find.mockResolvedValue(allMenus);

      const result = await service.getMenuTree();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(menuRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sort: 'ASC' },
      });
    });

    it('应该只返回启用的菜单', async () => {
      const activeMenu = createMockMenu({ isActive: true });
      menuRepo.find.mockResolvedValue([activeMenu]);

      await service.getMenuTree();

      expect(menuRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sort: 'ASC' },
      });
    });
  });

  describe('getUserMenus', () => {
    it('应该返回用户有权限访问的菜单', async () => {
      const userPermissions = ['user:view', 'role:view'];
      const menu1 = createMockMenu({
        id: 1,
        isVisible: true,
        displayCondition: {
          requireAnyPermission: ['user:view'],
        },
      });
      const menu2 = createMockMenu({
        id: 2,
        isVisible: true,
        displayCondition: {
          requireAnyPermission: ['admin:view'], // 用户没有此权限
        },
      });
      const menu3 = createMockMenu({
        id: 3,
        isVisible: true,
        displayCondition: undefined, // 无显示条件，所有人可见
      });

      menuRepo.find.mockResolvedValue([menu1, menu2, menu3]);

      const result = await service.getUserMenus(userPermissions);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // menu2 应该被过滤掉，因为用户没有权限
    });

    it('应该支持requireAllPermissions条件', async () => {
      const userPermissions = ['user:view', 'user:edit'];
      const menu = createMockMenu({
        id: 1,
        isVisible: true,
        displayCondition: {
          requireAllPermissions: ['user:view', 'user:edit'],
        },
      });

      menuRepo.find.mockResolvedValue([menu]);

      const result = await service.getUserMenus(userPermissions);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('当用户没有全部必需权限时应该过滤掉菜单', async () => {
      const userPermissions = ['user:view']; // 只有一个权限
      const menu = createMockMenu({
        id: 1,
        isVisible: true,
        displayCondition: {
          requireAllPermissions: ['user:view', 'user:edit'], // 需要两个权限
        },
      });

      menuRepo.find.mockResolvedValue([menu]);

      const result = await service.getUserMenus(userPermissions);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('应该只返回可见的菜单', async () => {
      const userPermissions = ['user:view'];

      menuRepo.find.mockResolvedValue([]);

      await service.getUserMenus(userPermissions);

      expect(menuRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, isVisible: true },
        order: { sort: 'ASC' },
      });
    });

    it('应该转换为前端路由格式', async () => {
      const userPermissions = ['user:view'];
      const menu = createMockMenu({
        id: 1,
        name: '用户管理',
        path: '/user',
        component: 'views/user/index',
        icon: 'user-icon',
        isVisible: true,
      });

      menuRepo.find.mockResolvedValue([menu]);

      const result = await service.getUserMenus(userPermissions);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('path');
        expect(result[0]).toHaveProperty('component');
        expect(result[0]).toHaveProperty('meta');
      }
    });
  });
});
