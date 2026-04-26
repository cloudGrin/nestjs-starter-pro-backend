import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { PermissionEntity } from '../entities/permission.entity';
import { CreatePermissionDto, UpdatePermissionDto, QueryPermissionDto } from '../dto';
import { faker } from '@faker-js/faker';

const createQueryBuilderMock = () => {
  const builder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  return builder;
};

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepo: any;
  let logger: jest.Mocked<LoggerService>;
  let cache: jest.Mocked<CacheService>;

  const createMockPermission = (overrides?: Partial<PermissionEntity>): PermissionEntity => {
    const permission = new PermissionEntity();
    permission.id = faker.number.int({ min: 1, max: 1000 });
    permission.code = faker.string.alphanumeric(10);
    permission.name = faker.lorem.words(2);
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
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };
    const mockCache = {
      delByPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: getRepositoryToken(PermissionEntity), useValue: mockPermissionRepo },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepo = module.get(getRepositoryToken(PermissionEntity));
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
      module: 'user',
      description: '查看用户权限',
    };

    it('应该成功创建权限', async () => {
      const mockPermission = createMockPermission({
        code: mockCreateDto.code,
        name: mockCreateDto.name,
      });
      const qb = createQueryBuilderMock();

      qb.getCount.mockResolvedValue(0);
      permissionRepo.createQueryBuilder.mockReturnValue(qb);
      permissionRepo.create.mockReturnValue(mockPermission);
      permissionRepo.save.mockResolvedValue(mockPermission);

      const result = await service.create(mockCreateDto);

      expect(result).toEqual(mockPermission);
      expect(permissionRepo.create).toHaveBeenCalledWith(mockCreateDto);
      expect(permissionRepo.save).toHaveBeenCalledWith(mockPermission);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(`创建权限: ${mockPermission.name}`),
      );
    });

    it('当权限编码已存在时应该抛出ConflictException', async () => {
      const qb = createQueryBuilderMock();
      qb.getCount.mockResolvedValue(1);
      permissionRepo.createQueryBuilder.mockReturnValue(qb);

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
      const mockPermission = createMockPermission({ id: permissionId });
      const updatedPermission = createMockPermission({
        ...mockPermission,
        ...mockUpdateDto,
      });

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.save.mockResolvedValue(updatedPermission);

      const result = await service.update(permissionId, mockUpdateDto);

      expect(result).toEqual(updatedPermission);
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
      expect(permissionRepo.save).toHaveBeenCalled();
      expect(cache.delByPattern).toHaveBeenCalledWith('user:permissions:*');
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow('权限不存在');
    });

    it('更新权限编码时检查是否与其他权限冲突', async () => {
      const mockPermission = createMockPermission({ id: permissionId, code: 'old:code' });
      const qb = createQueryBuilderMock();

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(1);

      await expect(service.update(permissionId, { code: 'new:code' })).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(permissionId, { code: 'new:code' })).rejects.toThrow(
        '权限编码 new:code 已存在',
      );
    });

    it('系统内置权限不能更新', async () => {
      const systemPermission = createMockPermission({
        id: permissionId,
        isSystem: true,
      });

      permissionRepo.findOne.mockResolvedValue(systemPermission);

      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(permissionId, mockUpdateDto)).rejects.toThrow(
        '系统内置权限不能修改',
      );
      expect(permissionRepo.save).not.toHaveBeenCalled();
      expect(cache.delByPattern).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const permissionId = 1;

    it('应该成功删除权限', async () => {
      const mockPermission = createMockPermission({
        id: permissionId,
        isSystem: false,
      });

      permissionRepo.findOne.mockResolvedValue(mockPermission);
      permissionRepo.delete.mockResolvedValue(undefined);

      await service.delete(permissionId);

      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
        relations: ['roles'],
      });
      expect(permissionRepo.delete).toHaveBeenCalledWith(permissionId);
      expect(cache.delByPattern).toHaveBeenCalledWith('user:permissions:*');
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(permissionId)).rejects.toThrow(NotFoundException);
      await expect(service.delete(permissionId)).rejects.toThrow('权限不存在');
      expect(permissionRepo.delete).not.toHaveBeenCalled();
    });

    it('系统内置权限不能删除', async () => {
      const systemPermission = createMockPermission({
        id: permissionId,
        isSystem: true,
      });

      permissionRepo.findOne.mockResolvedValue(systemPermission);

      await expect(service.delete(permissionId)).rejects.toThrow(BadRequestException);
      await expect(service.delete(permissionId)).rejects.toThrow('系统内置权限不能删除');
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
      const permissionId = 1;
      const mockPermission = createMockPermission({ id: permissionId });

      permissionRepo.findOne.mockResolvedValue(mockPermission);

      const result = await service.findById(permissionId);

      expect(result).toEqual(mockPermission);
      expect(permissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
    });

    it('当权限不存在时应该抛出NotFoundException', async () => {
      permissionRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow('权限不存在');
    });
  });

  describe('findAll', () => {
    it('应该返回分页的权限列表', async () => {
      const query: QueryPermissionDto = { page: 1, limit: 10, module: 'user' };
      const mockPermissions = [createMockPermission(), createMockPermission()];
      const qb = createQueryBuilderMock();

      permissionRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([mockPermissions, 2]);

      const result = await service.findAll(query);

      expect(result.items).toEqual(mockPermissions);
      expect(result.meta).toEqual({
        totalItems: 2,
        itemCount: 2,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 1,
      });
    });

    it('使用默认分页参数', async () => {
      const qb = createQueryBuilderMock();
      permissionRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getManyAndCount.mockResolvedValue([[createMockPermission()], 1]);

      const result = await service.findAll({});

      expect(result.meta.itemsPerPage).toBe(20);
      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe('getPermissionTree', () => {
    it('应该返回权限树结构', async () => {
      const permissions = [
        createMockPermission({ module: 'auth', code: 'auth:login' }),
        createMockPermission({ module: 'user', code: 'user:read' }),
      ];

      permissionRepo.find.mockResolvedValue(permissions);

      const result = await service.getPermissionTree();

      expect(result).toEqual([
        {
          module: 'auth',
          name: '认证模块',
          permissions: [permissions[0]],
        },
        {
          module: 'user',
          name: '用户管理',
          permissions: [permissions[1]],
        },
      ]);
    });
  });
});
