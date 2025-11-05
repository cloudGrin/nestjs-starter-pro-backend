import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { NotificationChannel, NotificationDeliveryResult } from '../entities/notification.entity';
import { ChannelSendContext, NotificationChannelAdapter } from './notification-channel.interface';

interface BarkConfig {
  enable: boolean;
  baseUrl?: string;
  defaultKey?: string;
}

@Injectable()
export class BarkChannelAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannel.BARK;

  private readonly config: BarkConfig;
  private readonly logger = new Logger(BarkChannelAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = this.configService.get<BarkConfig>('notification.channels.bark', {
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
        error: 'Bark channel disabled',
        sentAt,
      };
    }

    const key = (context.notification.metadata as any)?.barkKey ?? this.config.defaultKey;

    if (!key) {
      this.logger.warn(
        `Skip Bark delivery: missing device key for notification ${context.notification.id}`,
      );
      return {
        channel: this.type,
        success: false,
        error: 'Missing Bark device key',
        sentAt,
      };
    }

    const baseUrl = this.config.baseUrl || 'https://api.day.app';
    const url = `${baseUrl}/${key}`;
    // Bark 接口仅接受 title/body/url 等字段，必要时从 metadata 中补充
    const payload = {
      title: context.notification.title,
      body: context.notification.content,
      group: (context.notification.metadata as any)?.barkGroup || 'home',
      url: (context.notification.metadata as any)?.link,
      isArchive: 1,
    };

    try {
      const response = await firstValueFrom(this.httpService.post(url, payload));

      const success = response.data?.code === 200 || response.status === 200;
      this.logger.debug(
        `[Bark] Send notification ${context.notification.id} to ${key}, success=${success}`,
      );
      return {
        channel: this.type,
        success,
        response: typeof response.data === 'object' ? response.data : undefined,
        error: success ? undefined : response.data?.message || 'Unknown Bark response',
        sentAt,
      };
    } catch (error: any) {
      this.logger.error(
        `[Bark] Failed to send notification ${context.notification.id}: ${error?.message || error}`,
      );
      return {
        channel: this.type,
        success: false,
        error: error?.message || 'Bark request failed',
        sentAt,
      };
    }
  }
}
