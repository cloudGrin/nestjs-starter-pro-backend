import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeepPartial } from 'typeorm';
import { BaseService } from '~/core/base/base.service';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { BusinessException } from '~/common/exceptions/business.exception';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from '../entities/notification.entity';
import {
  NotificationRepository,
  NotificationQueryOptions,
} from '../repositories/notification.repository';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { UserRepository } from '~/modules/user/repositories/user.repository';
import { NotificationChannelManager } from '../channels/notification-channel.manager';

export interface NotificationEventPayload {
  notifications: NotificationEntity[];
}

@Injectable()
export class NotificationService extends BaseService<NotificationEntity> {
  protected repository: NotificationRepository;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository,
    private readonly channelManager: NotificationChannelManager,
    logger: LoggerService,
    cache: CacheService,
    eventEmitter: EventEmitter2,
  ) {
    super();
    this.repository = notificationRepository;
    this.logger = logger;
    this.cache = cache;
    this.eventEmitter = eventEmitter;
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
    const recipients = await this.userRepository.findByIds(uniqueRecipientIds);

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
    const notifications = await this.repository.createMany(payloads);

    const deliveryMap = await this.channelManager.dispatch(notifications);

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
              `${id}:${items
                .map((item) => `${item.channel}:${item.success ? 'ok' : 'fail'}`)
                .join('|')}`,
          )
          .join(', ')}`,
      );
    }

    await this.clearCache();
    this.eventEmitter.emit('notification.created', {
      notifications,
    } as NotificationEventPayload);

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

    return this.notificationRepository.paginateUserNotifications(
      userId,
      paginationOptions,
      filters,
    );
  }

  /**
   * 获取未读通知
   */
  async findUnread(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepository.findUnread(userId);
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(id: number, userId: number): Promise<void> {
    const result = await this.notificationRepository.markAsRead(id, userId);
    if (!result.affected) {
      throw BusinessException.notFound('通知', id);
    }
    await this.clearCache(userId);
    this.eventEmitter.emit('notification.read', { id, userId });
    this.logger?.debug(`[Notification] User ${userId} mark notification ${id} as read`);
  }

  /**
   * 批量标记已读
   */
  async markAllAsRead(userId: number): Promise<number> {
    const affected = await this.notificationRepository.markAllAsRead(userId);
    await this.clearCache(userId);
    this.eventEmitter.emit('notification.readAll', { userId, affected });
    this.logger?.log(`[Notification] User ${userId} mark ${affected} notifications as read`);
    return affected;
  }

  /**
   * 解析接收人
   */
  private async resolveRecipientIds(dto: CreateNotificationDto): Promise<number[]> {
    if (dto.isBroadcast) {
      return this.userRepository.findActiveUserIds();
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
}
