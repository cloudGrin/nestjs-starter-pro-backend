import {
  NotificationEntity,
  NotificationChannel,
  NotificationDeliveryResult,
} from '../entities/notification.entity';
import { UserNotificationSettingEntity } from '../entities/user-notification-setting.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

export interface ChannelSendContext {
  notification: NotificationEntity;
  recipient: UserEntity;
  notificationSetting?: UserNotificationSettingEntity;
}

export interface NotificationChannelAdapter {
  readonly type: NotificationChannel;
  send(context: ChannelSendContext): Promise<NotificationDeliveryResult>;
}
