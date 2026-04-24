import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { PermissionEntity, PermissionType } from '../entities/permission.entity';
import { CreatePermissionDto, UpdatePermissionDto, QueryPermissionDto } from '../dto';
import { faker } from '@faker-js/faker';

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepo: jest.Mocked<PermissionRepository>;
  let logger: jest.Mocked<LoggerService>;
  let cache: jest.Mocked<CacheService>;

  // Mock 数据工厂
  const createMockPermission = (overrides?: Partial<PermissionEntity>): PermissionEntity => {
    const permission = new PermissionEntity();
    permission.id = faker.number.int({ min: 1, max: 1000 });
    permission.code = faker.string.alphanumeric(10);
    permission.name = faker.lorem.words(2);
    permission.type = PermissionType.MENU;
    permission.module = 'system';
    permission.description = faker.lorem.sentence();
    permission.isActive = true;
    permission.isSystem = false;
    permission.sort = faker.number.int({ min: 0, max: 100 });
    permission.createdAt = new Date();
    permission.updatedAt = new Date();
    return Object.assign(permission, overrides);
  };

  beforeEach(async () => {
    const mockPermissionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
      isCodeExist: jest.fn(),
      findWithQuery: jest.fn(),
      getPermissionTree: jest.fn(),
      findByModule: jest.fn(),
      findByIds: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PermissionRepository, useValue: mockPermissionRepo },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepo = module.get(PermissionRepository);
    logger = module.get(LoggerService);
    cache = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateDto: CreatePermissionDto = {
      code: 'user:read',
      name: '查看用户',
      type: PermissionType.API,
      module: 'user',
      description: '查看用户权限',
    };

    it('应该成功创建权限', async () => {
      // Arrange
      const mockPermission = createMockPermission({
        code: mockCreateDto.code,
        name: mockCreateDto.name,
      });

      permissionRepo.isCodeExist.mockResolvedValue(false);
      permissionRepo.create.mockReturnValue(mockPermission);
      permissionRepo.save.mockResolvedValue(mockPermission);

      // Act
      const result = await service.create(mockCreateDto);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(permissionRepo.isCodeExist).toHaveBeenCalledWith(mockCreateDto.code);
      expect(permissionRepo.create).toHaveBeenCalledWith(mockCreateDto);
      expect(permissionRepo.save).toHaveBeenCalledWith(mockPermission);
      expect(cache.delByPattern).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`创建权限: ${mockPermission.name}`),
      );
    });

    it('当权限编码已存在时应该抛出ConflictException', async () => {
      // Arrange
      permissionRepo.isCodeExist.mockResolvedValue(true);

      // Act & Assert
      await expect(service.create(mockCreateDto)).rejects.toThrow(ConflictException);
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        `权限编码 ${mockCreateDto.code} 已存在`,
      );

      expect(permissionRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const permissionId = 1;
    const mockUpdateDto: UpdatePermissionDto = {
      name: '更新后的权限名',
      description: '更新后的描述',
    };

    it('应该成功更新权限', async () => {
      // Arrange
      const mockPermission = createMockPermission({ id: permissionId });
      const updatedPermission = createMockPermission({
        ...mockPermission,
        ...mockUpdateDto,
      });

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.save.mockResolvedValue(updatedPermission);

      // Act
      const result = await service.update(permissionId, mockUpdateDto);

      // Assert
      expect(result).toEqual(updatedPermission);
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
      expect(permissionRepo.save).toHaveBeenCalled();
      expect(cache.delByPattern).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      // Arrange
      permissionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow('权限不存在');
    });

    it('更新权限编码时检查是否与其他权限冲突', async () => {
      // Arrange
      const mockPermission = createMockPermission({ id: permissionId, code: 'old:code' });
      const updateWithNewCode = { code: 'new:code' };

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.isCodeExist.mockResolvedValue(true); // 新编码已存在

      // Act & Assert
      await expect(service.update(permissionId, updateWithNewCode)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(permissionId, updateWithNewCode)).rejects.toThrow(
        `权限编码 ${updateWithNewCode.code} 已存在`,
      );

      expect(permissionRepo.isCodeExist).toHaveBeenCalledWith('new:code', permissionId);
    });
  });

  describe('delete', () => {
    const permissionId = 1;

    it('应该成功删除权限', async () => {
      // Arrange
      const mockPermission = createMockPermission({
        id: permissionId,
        isSystem: false,
      });

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.delete.mockResolvedValue(undefined as any);

      // Act
      await service.delete(permissionId);

      // Assert
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
        relations: ['roles'],
      });
      expect(permissionRepo.delete).toHaveBeenCalledWith(permissionId);
      expect(permissionRepo.softDelete).not.toHaveBeenCalled();
      expect(cache.delByPattern).toHaveBeenCalled();
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      // Arrange
      permissionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.delete(permissionId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(permissionId)).rejects.toThrow('权限不存在');

      expect(permissionRepo.softDelete).not.toHaveBeenCalled();
      expect(permissionRepo.delete).not.toHaveBeenCalled();
    });

    it('系统内置权限不能删除', async () => {
      // Arrange
      const systemPermission = createMockPermission({
        id: permissionId,
        isSystem: true,
      });

      permissionRepo.findOne.mockResolvedValue(systemPermission);

      // Act & Assert
      await expect(service.delete(permissionId)).rejects.toThrow(BadRequestException);
      await expect(service.delete(permissionId)).rejects.toThrow('系统内置权限不能删除');

      expect(permissionRepo.softDelete).not.toHaveBeenCalled();
      expect(permissionRepo.delete).not.toHaveBeenCalled();
    });

    it('被角色引用的权限不能删除', async () => {
      const referencedPermission = createMockPermission({
        id: permissionId,
        isSystem: false,
      });
      referencedPermission.roles = [{ id: 2, code: 'editor' } as any];

      permissionRepo.findOne.mockResolvedValue(referencedPermission);

      await expect(service.delete(permissionId)).rejects.toThrow(BadRequestException);
      await expect(service.delete(permissionId)).rejects.toThrow('该权限正在被角色使用，不能删除');

      expect(permissionRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('应该成功返回权限详情', async () => {
      // Arrange
      const permissionId = 1;
      const mockPermission = createMockPermission({ id: permissionId });

      permissionRepo.findOne.mockResolvedValue(mockPermission);

      // Act
      const result = await service.findById(permissionId);

      // Assert
      expect(result).toEqual(mockPermission);
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      // Arrange
      const permissionId = 999;
      permissionRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(permissionId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(permissionId)).rejects.toThrow('权限不存在');
    });
  });

  describe('findAll', () => {
    it('应该返回分页的权限列表', async () => {
      // Arrange
      const query: QueryPermissionDto = { page: 1, limit: 10, module: 'user' };
      const mockPermissions = [createMockPermission(), createMockPermission()];
      const totalItems = 2;

      permissionRepo.findWithQuery.mockResolvedValue([mockPermissions, totalItems]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toEqual(mockPermissions);
      expect(result.meta).toEqual({
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
      expect(permissionRepo.findWithQuery).toHaveBeenCalledWith(query);
    });

    it('使用默认分页参数', async () => {
      // Arrange
      const query: QueryPermissionDto = {};
      const mockPermissions = [createMockPermission()];
      const totalItems = 1;

      permissionRepo.findWithQuery.mockResolvedValue([mockPermissions, totalItems]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.meta.itemsPerPage).toBe(20); // 默认值
      expect(result.meta.currentPage).toBe(1); // 默认值
    });
  });

  describe('getPermissionTree', () => {
    it('应该返回权限树结构', async () => {
      // Arrange
      const mockTree = [
        {
          id: 1,
          name: '系统管理',
          children: [
            { id: 2, name: '用户管理', children: [] },
            { id: 3, name: '角色管理', children: [] },
          ],
        },
      ];

      permissionRepo.getPermissionTree.mockResolvedValue(mockTree);

      // Act
      const result = await service.getPermissionTree();

      // Assert
      expect(result).toEqual(mockTree);
      expect(permissionRepo.getPermissionTree).toHaveBeenCalled();
    });
  });

  describe('findByModule', () => {
    it('应该根据模块返回权限列表', async () => {
      // Arrange
      const module = 'user';
      const mockPermissions = [createMockPermission({ module }), createMockPermission({ module })];

      permissionRepo.findByModule.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.findByModule(module);

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(permissionRepo.findByModule).toHaveBeenCalledWith(module);
    });
  });

  describe('findByIds', () => {
    it('应该批量查询权限', async () => {
      // Arrange
      const ids = [1, 2, 3];
      const mockPermissions = ids.map((id) => createMockPermission({ id }));

      permissionRepo.findByIds.mockResolvedValue(mockPermissions);

      // Act
      const result = await service.findByIds(ids);

      // Assert
      expect(result).toEqual(mockPermissions);
      expect(permissionRepo.findByIds).toHaveBeenCalledWith(ids);
    });

    it('当传入空数组时应该返回空数组', async () => {
      // Act
      const result = await service.findByIds([]);

      // Assert
      expect(result).toEqual([]);
      expect(permissionRepo.findByIds).not.toHaveBeenCalled();
    });

    it('当传入null或undefined时应该返回空数组', async () => {
      // Act
      const resultNull = await service.findByIds(null as any);
      const resultUndefined = await service.findByIds(undefined as any);

      // Assert
      expect(resultNull).toEqual([]);
      expect(resultUndefined).toEqual([]);
      expect(permissionRepo.findByIds).not.toHaveBeenCalled();
    });
  });
});
