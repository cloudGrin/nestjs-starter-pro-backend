import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { NotificationChannel, NotificationDeliveryResult } from '../entities/notification.entity';
import { ChannelSendContext, NotificationChannelAdapter } from './notification-channel.interface';

interface FeishuConfig {
  enable: boolean;
  defaultWebhook?: string;
}

@Injectable()
export class FeishuChannelAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannel.FEISHU;

  private readonly config: FeishuConfig;
  private readonly logger = new Logger(FeishuChannelAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = this.configService.get<FeishuConfig>('notification.channels.feishu', {
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
        error: 'Feishu channel disabled',
        sentAt,
      };
    }

    const webhook =
      (context.notification.metadata as any)?.feishuWebhook ?? this.config.defaultWebhook;

    if (!webhook) {
      this.logger.warn(
        `Skip Feishu delivery: missing webhook for notification ${context.notification.id}`,
      );
      return {
        channel: this.type,
        success: false,
        error: 'Missing Feishu webhook',
        sentAt,
      };
    }

    // 使用互动卡片提升可读性，如需纯文本可调整 msg_type
    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: context.notification.title,
          },
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: context.notification.content,
            },
          },
          ...(context.notification.metadata && (context.notification.metadata as any).link
            ? [
                {
                  tag: 'action',
                  actions: [
                    {
                      tag: 'button',
                      text: {
                        tag: 'plain_text',
                        content: (context.notification.metadata as any).linkText || '查看详情',
                      },
                      type: 'primary',
                      url: (context.notification.metadata as any).link,
                    },
                  ],
                },
              ]
            : []),
        ],
      },
    };

    try {
      const response = await firstValueFrom(this.httpService.post(webhook, payload));
      const ok = response.data?.StatusCode === 0 || response.data?.code === 0;
      this.logger.debug(`[Feishu] Send notification ${context.notification.id}, success=${ok}`);
      return {
        channel: this.type,
        success: ok,
        response: typeof response.data === 'object' ? response.data : undefined,
        error: ok ? undefined : response.data?.msg || 'Feishu webhook error',
        sentAt,
      };
    } catch (error: any) {
      this.logger.error(
        `[Feishu] Failed to send notification ${context.notification.id}: ${error?.message || error}`,
      );
      return {
        channel: this.type,
        success: false,
        error: error?.message || 'Feishu request failed',
        sentAt,
      };
    }
  }
}
