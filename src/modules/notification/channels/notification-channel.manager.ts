import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NotificationEntity,
  NotificationChannel,
  NotificationDeliveryResult,
} from '../entities/notification.entity';
import { UserRepository } from '~/modules/user/repositories/user.repository';
import { NotificationChannelAdapter } from './notification-channel.interface';
import { NOTIFICATION_CHANNEL_ADAPTERS } from './notification-channel.tokens';

interface DispatchOptions {
  forceExternal?: boolean;
}

@Injectable()
export class NotificationChannelManager {
  private readonly logger = new Logger(NotificationChannelManager.name);

  constructor(
    @Inject(NOTIFICATION_CHANNEL_ADAPTERS)
    private readonly adapters: NotificationChannelAdapter[],
    private readonly userRepository: UserRepository,
  ) {}

  async dispatch(
    notifications: NotificationEntity[],
    options: DispatchOptions = {},
  ): Promise<Map<number, NotificationDeliveryResult[]>> {
    const results = new Map<number, NotificationDeliveryResult[]>();

    // 优化：批量查询所有需要的用户信息，避免N+1查询
    const recipientIds = notifications
      .filter((n) => n.recipientId)
      .map((n) => n.recipientId)
      .filter((id): id is number => id !== undefined);

    const uniqueRecipientIds = Array.from(new Set(recipientIds));
    const recipients =
      uniqueRecipientIds.length > 0 ? await this.userRepository.findByIds(uniqueRecipientIds) : [];

    const recipientMap = new Map(recipients.map((r) => [r.id, r]));

    for (const notification of notifications) {
      if (!notification.recipientId) {
        continue;
      }

      const shouldSendExternal = options.forceExternal || notification.sendExternalWhenOffline;

      if (!shouldSendExternal) {
        this.logger.verbose(
          `[NotificationChannel] Skip external channels for notification ${notification.id} (external delivery not requested)`,
        );
        continue;
      }

      // 过滤出所有站外渠道（排除站内）
      const externalChannels =
        notification.channels?.filter((channel) => channel !== NotificationChannel.INTERNAL) || [];

      if (externalChannels.length === 0) {
        this.logger.debug(
          `[NotificationChannel] No external channels configured for notification ${notification.id}`,
        );
        continue;
      }

      const recipient = recipientMap.get(notification.recipientId);

      if (!recipient) {
        this.logger.warn(
          `Recipient ${notification.recipientId} not found for notification ${notification.id}`,
        );
        continue;
      }

      const deliveryResults: NotificationDeliveryResult[] = [];

      for (const channel of externalChannels) {
        const adapter = this.adapters.find((item) => item.type === channel);
        if (!adapter) {
          deliveryResults.push({
            channel,
            success: false,
            error: 'Channel adapter not found',
            sentAt: new Date().toISOString(),
          });
          this.logger.warn(
            `Channel adapter ${channel} not found for notification ${notification.id}`,
          );
          continue;
        }

        if (!adapter.isEnabled()) {
          deliveryResults.push({
            channel,
            success: false,
            error: 'Channel not enabled',
            sentAt: new Date().toISOString(),
          });
          this.logger.warn(
            `Channel ${channel} disabled while processing notification ${notification.id}`,
          );
          continue;
        }

        try {
          const result = await adapter.send({ notification, recipient });
          deliveryResults.push(result);
          this.logger.debug(
            `[NotificationChannel] Sent notification ${notification.id} via ${channel}, success=${result.success}`,
          );
        } catch (error: any) {
          deliveryResults.push({
            channel,
            success: false,
            error: error?.message || 'Unknown channel error',
            sentAt: new Date().toISOString(),
          });
          this.logger.error(
            `Failed to send notification ${notification.id} via ${channel}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      results.set(notification.id, deliveryResults);
    }

    return results;
  }
}
