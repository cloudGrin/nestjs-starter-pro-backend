import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import { UserStatus } from '~/common/enums/user.enum';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationDeliveryResult,
} from '../entities/notification.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { BarkChannelAdapter } from '../channels/bark.channel';
import { FeishuChannelAdapter } from '../channels/feishu.channel';
import { NotificationChannelAdapter } from '../channels/notification-channel.interface';

export interface NotificationEventPayload {
  notifications: NotificationEntity[];
}

interface NotificationQueryOptions {
  status?: NotificationStatus;
  type?: NotificationType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

const NOTIFICATION_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'readAt', 'priority']);

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly barkChannelAdapter: BarkChannelAdapter,
    private readonly feishuChannelAdapter: FeishuChannelAdapter,
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(NotificationService.name);
  }

  /**
   * 创建通知（支持广播与多用户发送）
   */
  async createNotification(
    dto: CreateNotificationDto,
    senderId?: number,
  ): Promise<NotificationEntity[]> {
    const recipientIds = await this.resolveRecipientIds(dto);

    if (recipientIds.length === 0) {
      throw BusinessException.validationFailed('请选择至少一个通知接收人');
    }

    const uniqueRecipientIds = Array.from(new Set(recipientIds));
    const recipients = await this.findUsersByIds(uniqueRecipientIds);

    if (recipients.length !== uniqueRecipientIds.length) {
      const existingIds = recipients.map((recipient) => recipient.id);
      const missingIds = uniqueRecipientIds.filter((id) => !existingIds.includes(id));
      throw BusinessException.validationFailed(`以下用户不存在：${missingIds.join(', ')}`);
    }

    const isSystem = dto.isBroadcast || dto.type === NotificationType.SYSTEM;
    const channels = this.normalizeChannels(dto.channels);
    const sendExternalWhenOffline = dto.sendExternalWhenOffline ?? false;
    this.logger?.debug(
      `[Notification] Prepare notification for recipients=${uniqueRecipientIds.join(',')} channels=${channels.join(',')} sendExternalWhenOffline=${sendExternalWhenOffline}`,
    );
    const payloads: DeepPartial<NotificationEntity>[] = uniqueRecipientIds.map((recipientId) => ({
      title: dto.title,
      content: dto.content,
      type: dto.type ?? NotificationType.SYSTEM,
      priority: dto.priority,
      status: NotificationStatus.UNREAD,
      recipientId,
      senderId,
      isSystem,
      metadata: dto.metadata,
      channels: [...channels],
      sendExternalWhenOffline,
      expireAt: dto.expireAt ? new Date(dto.expireAt) : undefined,
    }));

    // 单次批量写入，确保同一事件的通知具备一致的创建时间戳
    const notifications = await this.notificationRepository.save(
      this.notificationRepository.create(payloads),
    );
    const deliveryMap = await this.dispatchExternal(notifications, sendExternalWhenOffline);

    await Promise.all(
      notifications.map(async (notification) => {
        const deliveryResults = deliveryMap.get(notification.id);
        if (deliveryResults && deliveryResults.length > 0) {
          notification.deliveryResults = deliveryResults;
          await this.notificationRepository.update(notification.id, {
            deliveryResults: deliveryResults as any,
          });
        }
      }),
    );
    if (deliveryMap.size > 0) {
      this.logger?.log(
        `[Notification] External delivery results: ${Array.from(deliveryMap.entries())
          .map(
            ([id, items]) =>
              `${id}:${(items || [])
                .map((item) => `${item.channel}:${item.success ? 'ok' : 'fail'}`)
                .join('|')}`,
          )
          .join(', ')}`,
      );
    }

    await this.clearNotificationCache();

    this.logger?.log(
      `Created ${notifications.length} notifications by sender ${senderId ?? 'system'}`,
    );

    return notifications;
  }

  /**
   * 获取用户通知列表（分页）
   */
  async findUserNotifications(userId: number, query: QueryNotificationDto) {
    const filters: NotificationQueryOptions = {
      status: query.status,
      type: query.type,
      keyword: query.keyword,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const paginationOptions = {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
    };

    return this.paginateUserNotifications(userId, paginationOptions, filters);
  }

  /**
   * 获取未读通知
   */
  async findUnread(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: {
        recipientId: userId,
        status: NotificationStatus.UNREAD,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(id: number, userId: number): Promise<void> {
    const result = await this.notificationRepository.update(
      { id, recipientId: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: () => 'CURRENT_TIMESTAMP',
      },
    );
    if (!result.affected) {
      throw BusinessException.notFound('通知', id);
    }
    await this.clearNotificationCache(userId);
    this.logger?.debug(`[Notification] User ${userId} mark notification ${id} as read`);
  }

  /**
   * 批量标记已读
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      { recipientId: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: () => 'CURRENT_TIMESTAMP',
      },
    );
    const affected = result.affected || 0;
    await this.clearNotificationCache(userId);
    this.logger?.log(`[Notification] User ${userId} mark ${affected} notifications as read`);
    return affected;
  }

  /**
   * 解析接收人
   */
  private async resolveRecipientIds(dto: CreateNotificationDto): Promise<number[]> {
    if (dto.isBroadcast) {
      return this.findActiveUserIds();
    }

    if (dto.recipientIds && dto.recipientIds.length > 0) {
      return dto.recipientIds;
    }

    return [];
  }

  private normalizeChannels(channels?: NotificationChannel[]): NotificationChannel[] {
    // 保证至少包含站内通知渠道并去重
    const list =
      channels && channels.length > 0
        ? Array.from(new Set(channels))
        : [NotificationChannel.INTERNAL];

    if (!list.includes(NotificationChannel.INTERNAL)) {
      list.unshift(NotificationChannel.INTERNAL);
    }
    this.logger?.debug(`[Notification] Selected channels: ${list.join(', ')}`);
    return list;
  }

  private async dispatchExternal(
    notifications: NotificationEntity[],
    forceExternal = false,
  ): Promise<Map<number, NotificationDeliveryResult[]>> {
    const results = new Map<number, NotificationDeliveryResult[]>();
    const recipientIds = Array.from(
      new Set(
        notifications
          .map((notification) => notification.recipientId)
          .filter((recipientId): recipientId is number => typeof recipientId === 'number'),
      ),
    );

    const recipients = recipientIds.length > 0 ? await this.findUsersByIds(recipientIds) : [];
    const recipientMap = new Map(recipients.map((recipient) => [recipient.id, recipient]));

    for (const notification of notifications) {
      if (!notification.recipientId) {
        continue;
      }

      const shouldSendExternal = forceExternal || notification.sendExternalWhenOffline;
      if (!shouldSendExternal) {
        continue;
      }

      const externalChannels =
        notification.channels?.filter((channel) => channel !== NotificationChannel.INTERNAL) || [];
      if (externalChannels.length === 0) {
        continue;
      }

      const recipient = recipientMap.get(notification.recipientId);
      if (!recipient) {
        this.logger?.warn(
          `[Notification] Recipient ${notification.recipientId} not found for notification ${notification.id}`,
        );
        continue;
      }

      const deliveryResults: NotificationDeliveryResult[] = [];

      for (const channel of externalChannels) {
        const adapter = this.getChannelAdapter(channel);
        if (!adapter) {
          deliveryResults.push({
            channel,
            success: false,
            error: 'Channel adapter not found',
            sentAt: new Date().toISOString(),
          });
          continue;
        }

        if (!adapter.isEnabled()) {
          deliveryResults.push({
            channel,
            success: false,
            error: 'Channel not enabled',
            sentAt: new Date().toISOString(),
          });
          continue;
        }

        try {
          deliveryResults.push(await adapter.send({ notification, recipient }));
        } catch (error: any) {
          deliveryResults.push({
            channel,
            success: false,
            error: error?.message || 'Unknown channel error',
            sentAt: new Date().toISOString(),
          });
        }
      }

      if (deliveryResults.length > 0) {
        results.set(notification.id, deliveryResults);
      }
    }

    return results;
  }

  private getChannelAdapter(channel: NotificationChannel): NotificationChannelAdapter | null {
    switch (channel) {
      case NotificationChannel.BARK:
        return this.barkChannelAdapter;
      case NotificationChannel.FEISHU:
        return this.feishuChannelAdapter;
      default:
        return null;
    }
  }

  private async clearNotificationCache(userId?: number): Promise<void> {
    if (userId !== undefined) {
      await this.cache.del(`notification:user:${userId}`);
    }

    await this.cache.delByPattern?.('Notification:*');
  }

  private async findUsersByIds(ids: number[]): Promise<UserEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: { id: In(ids) } as any,
      relations: ['roles'],
    });
  }

  private async findActiveUserIds(): Promise<number[]> {
    const users = await this.userRepository.find({
      select: ['id'],
      where: { status: UserStatus.ACTIVE } as any,
    });
    return users.map((user) => user.id);
  }

  private async paginateUserNotifications(
    userId: number,
    pagination: PaginationOptions,
    query: NotificationQueryOptions,
  ): Promise<PaginationResult<NotificationEntity>> {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.keyword) {
      qb.andWhere('(notification.title LIKE :keyword OR notification.content LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      qb.andWhere('notification.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    } else if (query.endDate) {
      qb.andWhere('notification.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (pagination.sort && NOTIFICATION_SORT_FIELDS.has(pagination.sort)) {
      qb.orderBy(`notification.${pagination.sort}`, pagination.order || 'DESC');
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;
    const [items, totalItems] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }
}
