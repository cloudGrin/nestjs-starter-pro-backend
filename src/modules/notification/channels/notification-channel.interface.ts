import {
  NotificationEntity,
  NotificationChannel,
  NotificationDeliveryResult,
} from '../entities/notification.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

export interface ChannelSendContext {
  notification: NotificationEntity;
  recipient: UserEntity;
}

export interface NotificationChannelAdapter {
  readonly type: NotificationChannel;
  isEnabled(): boolean;
  send(context: ChannelSendContext): Promise<NotificationDeliveryResult>;
}
