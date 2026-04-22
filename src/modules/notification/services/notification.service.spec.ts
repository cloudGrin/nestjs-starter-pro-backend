import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '~/modules/user/repositories/user.repository';
import { NotificationChannelManager } from '../channels/notification-channel.manager';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from '../entities/notification.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { UserEntity } from '~/modules/user/entities/user.entity';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let channelManager: jest.Mocked<NotificationChannelManager>;
  let logger: jest.Mocked<LoggerService>;
  let cache: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockNotificationRepository = {
      createMany: jest.fn(),
      update: jest.fn(),
      paginateUserNotifications: jest.fn(),
      findUnread: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const mockUserRepository = {
      findByIds: jest.fn(),
      findActiveUserIds: jest.fn(),
    };

    const mockChannelManager = {
      dispatch: jest.fn().mockResolvedValue(new Map()),
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockNotificationRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: NotificationChannelManager, useValue: mockChannelManager },
        { provide: LoggerService, useValue: mockLogger },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get(NotificationRepository);
    userRepository = module.get(UserRepository);
    channelManager = module.get(NotificationChannelManager);
    logger = module.get(LoggerService);
    cache = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('配置和初始化', () => {
    it('应该正确初始化服务', () => {
      expect(service).toBeDefined();
      expect(logger.setContext).toHaveBeenCalledWith('NotificationService');
    });
  });

  describe('createNotification', () => {
    it('应该成功创建单个用户通知', async () => {
      const dto = {
        title: '测试通知',
        content: '这是一条测试通知',
        recipientIds: [1],
        type: NotificationType.MESSAGE,
      };

      const mockUsers = [{ id: 1, username: 'test' }] as UserEntity[];
      const mockNotifications = [
        {
          id: 1,
          title: dto.title,
          content: dto.content,
          recipientId: 1,
          status: NotificationStatus.UNREAD,
        },
      ] as NotificationEntity[];

      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue(mockNotifications);

      const result = await service.createNotification(dto, 2);

      expect(result).toHaveLength(1);
      expect(userRepository.findByIds).toHaveBeenCalledWith([1]);
      expect(notificationRepository.createMany).toHaveBeenCalled();
    });

    it('应该成功创建多用户通知', async () => {
      const dto = {
        title: '群发通知',
        content: '这是一条群发通知',
        recipientIds: [1, 2, 3],
      };

      const mockUsers = [
        { id: 1, username: 'user1' },
        { id: 2, username: 'user2' },
        { id: 3, username: 'user3' },
      ] as UserEntity[];

      const mockNotifications = mockUsers.map((user, index) => ({
        id: index + 1,
        title: dto.title,
        content: dto.content,
        recipientId: user.id,
      })) as NotificationEntity[];

      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue(mockNotifications);

      const result = await service.createNotification(dto);

      expect(result).toHaveLength(3);
      expect(userRepository.findByIds).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('应该成功创建广播通知', async () => {
      const dto = {
        title: '系统广播',
        content: '这是一条系统广播通知',
        isBroadcast: true,
      };

      const activeUserIds = [1, 2, 3, 4, 5];
      const mockUsers = activeUserIds.map((id) => ({ id, username: `user${id}` })) as UserEntity[];
      const mockNotifications = mockUsers.map((user, index) => ({
        id: index + 1,
        title: dto.title,
        content: dto.content,
        recipientId: user.id,
        isSystem: true,
      })) as NotificationEntity[];

      userRepository.findActiveUserIds.mockResolvedValue(activeUserIds);
      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue(mockNotifications);

      const result = await service.createNotification(dto);

      expect(result).toHaveLength(5);
      expect(userRepository.findActiveUserIds).toHaveBeenCalled();
    });

    it('应该去重接收人ID', async () => {
      const dto = {
        title: '测试',
        content: '测试去重',
        recipientIds: [1, 1, 2, 2, 3], // 包含重复ID
      };

      const mockUsers = [
        { id: 1, username: 'user1' },
        { id: 2, username: 'user2' },
        { id: 3, username: 'user3' },
      ] as UserEntity[];

      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue([]);

      await service.createNotification(dto);

      expect(userRepository.findByIds).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('当没有接收人时应该抛出异常', async () => {
      const dto = {
        title: '测试',
        content: '测试',
        recipientIds: [],
      };

      await expect(service.createNotification(dto)).rejects.toThrow(BusinessException);
    });

    it('当接收人不存在时应该抛出异常', async () => {
      const dto = {
        title: '测试',
        content: '测试',
        recipientIds: [1, 999],
      };

      const mockUsers = [{ id: 1, username: 'user1' }] as UserEntity[];
      userRepository.findByIds.mockResolvedValue(mockUsers);

      await expect(service.createNotification(dto)).rejects.toThrow(BusinessException);
    });

    it('应该支持多渠道发送', async () => {
      const dto = {
        title: '多渠道通知',
        content: '这是一条多渠道通知',
        recipientIds: [1],
        channels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
      };

      const mockUsers = [{ id: 1, username: 'test' }] as UserEntity[];
      const mockNotifications = [
        {
          id: 1,
          title: dto.title,
          content: dto.content,
          recipientId: 1,
          channels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
        },
      ] as NotificationEntity[];

      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue(mockNotifications);

      await service.createNotification(dto);

      expect(channelManager.dispatch).toHaveBeenCalledWith(mockNotifications);
    });
  });

  describe('findUserNotifications', () => {
    it('应该成功查询用户通知列表', async () => {
      const userId = 1;
      const query = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      };

      notificationRepository.paginateUserNotifications.mockResolvedValue(mockResult);

      const result = await service.findUserNotifications(userId, query);

      expect(result).toEqual(mockResult);
      expect(notificationRepository.paginateUserNotifications).toHaveBeenCalledWith(
        userId,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('应该支持按状态过滤', async () => {
      const userId = 1;
      const query = {
        status: NotificationStatus.UNREAD,
        page: 1,
        limit: 10,
      };

      notificationRepository.paginateUserNotifications.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findUserNotifications(userId, query);

      expect(notificationRepository.paginateUserNotifications).toHaveBeenCalledWith(
        userId,
        expect.any(Object),
        expect.objectContaining({ status: NotificationStatus.UNREAD }),
      );
    });
  });

  describe('findUnread', () => {
    it('应该返回用户的未读通知', async () => {
      const userId = 1;
      const mockNotifications = [
        {
          id: 1,
          title: '未读通知1',
          status: NotificationStatus.UNREAD,
        },
        {
          id: 2,
          title: '未读通知2',
          status: NotificationStatus.UNREAD,
        },
      ] as NotificationEntity[];

      notificationRepository.findUnread.mockResolvedValue(mockNotifications);

      const result = await service.findUnread(userId);

      expect(result).toEqual(mockNotifications);
      expect(notificationRepository.findUnread).toHaveBeenCalledWith(userId);
    });
  });

  describe('markAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      const notificationId = 1;
      const userId = 1;

      notificationRepository.markAsRead.mockResolvedValue({ affected: 1 } as any);

      await service.markAsRead(notificationId, userId);

      expect(notificationRepository.markAsRead).toHaveBeenCalledWith(notificationId, userId);
    });

    it('当通知不存在时应该抛出异常', async () => {
      const notificationId = 999;
      const userId = 1;

      notificationRepository.markAsRead.mockResolvedValue({ affected: 0 } as any);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(BusinessException);
    });
  });

  describe('markAllAsRead', () => {
    it('应该成功批量标记所有通知为已读', async () => {
      const userId = 1;
      const affected = 5;

      notificationRepository.markAllAsRead.mockResolvedValue(affected);

      const result = await service.markAllAsRead(userId);

      expect(result).toBe(affected);
      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith(userId);
    });

    it('当没有未读通知时应该返回0', async () => {
      const userId = 1;

      notificationRepository.markAllAsRead.mockResolvedValue(0);

      const result = await service.markAllAsRead(userId);

      expect(result).toBe(0);
    });
  });

  describe('完整流程测试', () => {
    it('创建通知->查询未读->标记已读->查询列表', async () => {
      const userId = 1;

      // 1. 创建通知
      const createDto = {
        title: '流程测试通知',
        content: '这是一条流程测试通知',
        recipientIds: [userId],
      };

      const mockUsers = [{ id: userId, username: 'test' }] as UserEntity[];
      const createdNotification = {
        id: 1,
        title: createDto.title,
        content: createDto.content,
        recipientId: userId,
        status: NotificationStatus.UNREAD,
      } as NotificationEntity;

      userRepository.findByIds.mockResolvedValue(mockUsers);
      notificationRepository.createMany.mockResolvedValue([createdNotification]);

      const created = await service.createNotification(createDto);
      expect(created).toHaveLength(1);

      // 2. 查询未读
      notificationRepository.findUnread.mockResolvedValue([createdNotification]);
      const unread = await service.findUnread(userId);
      expect(unread).toHaveLength(1);

      // 3. 标记已读
      notificationRepository.markAsRead.mockResolvedValue({ affected: 1 } as any);
      await service.markAsRead(createdNotification.id, userId);

      // 4. 查询列表（应该是已读状态）
      notificationRepository.paginateUserNotifications.mockResolvedValue({
        items: [],
        meta: {
          totalItems: 0,
          itemCount: 0,
          itemsPerPage: 10,
          totalPages: 0,
          currentPage: 1,
        },
      });

      await service.findUserNotifications(userId, { page: 1, limit: 10 });
      expect(notificationRepository.paginateUserNotifications).toHaveBeenCalled();
    });
  });
});
