import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import { NotificationChannel, NotificationDeliveryResult } from '../entities/notification.entity';
import { ChannelSendContext, NotificationChannelAdapter } from './notification-channel.interface';

interface SmsConfig {
  enable: boolean;
  provider?: string;
  signName?: string;
  templateId?: string;
}

@Injectable()
export class SmsChannelAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannel.SMS;

  private readonly logger = new Logger(SmsChannelAdapter.name);
  private readonly config: SmsConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<SmsConfig>('notification.channels.sms', {
      enable: false,
    });
  }

  isEnabled(): boolean {
    return !!this.config?.enable;
  }

  async send(context: ChannelSendContext): Promise<NotificationDeliveryResult> {
    const sentAt = dayjs().toISOString();

    if (!this.isEnabled()) {
      return {
        channel: this.type,
        success: false,
        error: 'SMS channel disabled',
        sentAt,
      };
    }

    const phone = (context.notification.metadata as any)?.smsNumber ?? context.recipient.phone;

    if (!phone) {
      return {
        channel: this.type,
        success: false,
        error: 'Missing recipient phone number',
        sentAt,
      };
    }

    // 这里仅记录日志，实际项目需要接入具体短信服务商 SDK
    this.logger.debug(`Send SMS via ${this.config.provider || 'unknown provider'} to ${phone}`);

    return {
      channel: this.type,
      success: true,
      response: {
        provider: this.config.provider,
        signName: this.config.signName,
        templateId: this.config.templateId,
      },
      sentAt,
    };
  }
}
