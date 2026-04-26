import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from '../entities/notification.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { UserStatus } from '~/common/enums/user.enum';
import { BarkChannelAdapter } from '../channels/bark.channel';
import { FeishuChannelAdapter } from '../channels/feishu.channel';
import { createMockRepository, createMockLogger } from '~/test-utils';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<Repository<NotificationEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let barkAdapter: jest.Mocked<BarkChannelAdapter>;
  let feishuAdapter: jest.Mocked<FeishuChannelAdapter>;
  let _logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const mockNotificationRepository = createMockRepository<NotificationEntity>();
    const mockUserRepository = createMockRepository<UserEntity>();
    const mockBarkAdapter = {
      type: NotificationChannel.BARK,
      isEnabled: jest.fn().mockReturnValue(true),
      send: jest.fn(),
    } as unknown as jest.Mocked<BarkChannelAdapter>;
    const mockFeishuAdapter = {
      type: NotificationChannel.FEISHU,
      isEnabled: jest.fn().mockReturnValue(true),
      send: jest.fn(),
    } as unknown as jest.Mocked<FeishuChannelAdapter>;
    const mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: mockNotificationRepository },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        { provide: BarkChannelAdapter, useValue: mockBarkAdapter },
        { provide: FeishuChannelAdapter, useValue: mockFeishuAdapter },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get(NotificationService);
    notificationRepository = module.get(getRepositoryToken(NotificationEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    barkAdapter = module.get(BarkChannelAdapter);
    feishuAdapter = module.get(FeishuChannelAdapter);
    _logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该正确初始化服务', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('应该成功创建单个用户通知', async () => {
      const dto = {
        title: '测试通知',
        content: '这是一条测试通知',
        recipientIds: [1],
        type: NotificationType.MESSAGE,
      };
      const notifications = [{ id: 1, recipientId: 1 }] as NotificationEntity[];

      userRepository.find.mockResolvedValue([{ id: 1, username: 'test' }] as UserEntity[]);
      notificationRepository.create.mockReturnValue(notifications as any);
      notificationRepository.save.mockResolvedValue(notifications as any);

      const result = await service.createNotification(dto, 2);

      expect(result).toHaveLength(1);
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
        relations: ['roles'],
      });
      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalledWith(notifications);
    });

    it('uses explicit sendExternal flag instead of offline-only naming', async () => {
      const dto = {
        title: '外部通知',
        content: '推送内容',
        recipientIds: [1],
        channels: [NotificationChannel.FEISHU],
        sendExternal: true,
      };
      const notifications = [
        { id: 1, recipientId: 1, channels: dto.channels },
      ] as NotificationEntity[];

      userRepository.find.mockResolvedValue([{ id: 1, username: 'test' }] as UserEntity[]);
      notificationRepository.create.mockReturnValue(notifications as any);
      notificationRepository.save.mockResolvedValue(notifications as any);
      feishuAdapter.send.mockResolvedValue({
        channel: NotificationChannel.FEISHU,
        success: true,
        sentAt: new Date().toISOString(),
      });

      await service.createNotification(dto, 2);

      expect(notificationRepository.create).toHaveBeenCalledWith([
        expect.objectContaining({ sendExternal: true }),
      ]);
      expect(feishuAdapter.send).toHaveBeenCalled();
    });

    it('广播通知时应该查询所有活跃用户', async () => {
      userRepository.find
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as UserEntity[])
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as UserEntity[])
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as UserEntity[]);
      notificationRepository.create.mockReturnValue([
        { id: 1, recipientId: 1 },
        { id: 2, recipientId: 2 },
      ] as any);
      notificationRepository.save.mockResolvedValue([
        { id: 1, recipientId: 1 },
        { id: 2, recipientId: 2 },
      ] as any);

      await service.createNotification({
        title: '广播通知',
        content: '广播内容',
        isBroadcast: true,
        type: NotificationType.SYSTEM,
      });

      expect(userRepository.find).toHaveBeenNthCalledWith(1, {
        select: ['id'],
        where: { status: UserStatus.ACTIVE },
      });
    });

    it('接收人不存在时应该抛出异常', async () => {
      userRepository.find.mockResolvedValue([{ id: 1 }] as UserEntity[]);

      await expect(
        service.createNotification({
          title: '测试通知',
          content: '内容',
          recipientIds: [1, 2],
        }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('findUserNotifications', () => {
    it('应该分页查询用户通知', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findUserNotifications(1, { page: 1, limit: 10 });

      expect(result.meta.currentPage).toBe(1);
      expect(notificationRepository.createQueryBuilder).toHaveBeenCalledWith('notification');
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(notification.expireAt IS NULL OR notification.expireAt > CURRENT_TIMESTAMP)',
      );
    });

    it('ignores unsupported sort fields and keeps createdAt ordering', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.findUserNotifications(1, {
        page: 1,
        limit: 10,
        sort: 'id;DROP TABLE notifications',
      } as any);

      expect(qb.orderBy).toHaveBeenCalledWith('notification.createdAt', 'DESC');
      expect(qb.orderBy).not.toHaveBeenCalledWith(
        'notification.id;DROP TABLE notifications',
        expect.anything(),
      );
    });
  });

  describe('markAsRead', () => {
    it('应该标记单条通知为已读', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await service.markAsRead(1, 2);

      expect(qb.where).toHaveBeenCalledWith(
        'id = :id AND recipientId = :userId AND status = :status',
        { id: 1, userId: 2, status: NotificationStatus.UNREAD },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(expireAt IS NULL OR expireAt > CURRENT_TIMESTAMP)',
      );
    });

    it('通知不存在时应该抛出异常', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await expect(service.markAsRead(1, 2)).rejects.toThrow(BusinessException);
    });
  });

  describe('markAllAsRead', () => {
    it('应该批量标记已读', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.markAllAsRead(1);

      expect(result).toBe(3);
      expect(qb.where).toHaveBeenCalledWith('recipientId = :userId AND status = :status', {
        userId: 1,
        status: NotificationStatus.UNREAD,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(expireAt IS NULL OR expireAt > CURRENT_TIMESTAMP)',
      );
    });
  });

  describe('findUnread', () => {
    it('only returns unexpired unread notifications', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(qb as any);

      await expect(service.findUnread(1)).resolves.toEqual([]);

      expect(qb.where).toHaveBeenCalledWith(
        'notification.recipientId = :userId AND notification.status = :status',
        { userId: 1, status: NotificationStatus.UNREAD },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(notification.expireAt IS NULL OR notification.expireAt > CURRENT_TIMESTAMP)',
      );
    });
  });

  it('保留飞书和 bark adapter 注入', () => {
    expect(barkAdapter.isEnabled).toBeDefined();
    expect(feishuAdapter.isEnabled).toBeDefined();
  });
});
