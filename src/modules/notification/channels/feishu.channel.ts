import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import dayjs from 'dayjs';
import { NotificationChannel, NotificationDeliveryResult } from '../entities/notification.entity';
import { ChannelSendContext, NotificationChannelAdapter } from './notification-channel.interface';

interface FeishuConfig {
  appId?: string;
  appSecret?: string;
}

interface FeishuTenantAccessToken {
  value: string;
  expiresAt: number;
}

const FEISHU_API_BASE_URL = 'https://open.feishu.cn/open-apis';

@Injectable()
export class FeishuChannelAdapter implements NotificationChannelAdapter {
  readonly type = NotificationChannel.FEISHU;

  private readonly config: FeishuConfig;
  private readonly logger = new Logger(FeishuChannelAdapter.name);
  private tenantAccessToken?: FeishuTenantAccessToken;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.config = this.configService.get<FeishuConfig>('notification.channels.feishu', {
      appId: undefined,
      appSecret: undefined,
    });
  }

  async send(context: ChannelSendContext): Promise<NotificationDeliveryResult> {
    const sentAt = dayjs().toISOString();

    const receiveId = context.notificationSetting?.feishuUserId?.trim();

    if (!receiveId) {
      this.logger.warn(
        `Skip Feishu delivery: missing recipient binding for notification ${context.notification.id}`,
      );
      return {
        channel: this.type,
        success: false,
        error: 'Missing recipient Feishu user_id binding',
        sentAt,
      };
    }

    if (!this.config.appId || !this.config.appSecret) {
      return {
        channel: this.type,
        success: false,
        error: 'Missing Feishu app credentials',
        sentAt,
      };
    }

    const card = {
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
    };

    const payload = {
      receive_id: receiveId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    };

    try {
      const tenantAccessToken = await this.getTenantAccessToken();
      const response = await firstValueFrom(
        this.httpService.post(
          `${FEISHU_API_BASE_URL}/im/v1/messages?receive_id_type=user_id`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${tenantAccessToken}`,
            },
          },
        ),
      );
      const ok = response.data?.code === 0;
      this.logger.debug(
        `[Feishu] Send notification ${context.notification.id} to ${receiveId}, success=${ok}`,
      );
      return {
        channel: this.type,
        success: ok,
        response: typeof response.data === 'object' ? response.data : undefined,
        error: ok ? undefined : response.data?.msg || 'Feishu message error',
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

  private async getTenantAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tenantAccessToken && this.tenantAccessToken.expiresAt > now) {
      return this.tenantAccessToken.value;
    }

    const response = await firstValueFrom(
      this.httpService.post(`${FEISHU_API_BASE_URL}/auth/v3/tenant_access_token/internal`, {
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    );
    const token = response.data?.tenant_access_token;

    if (!token) {
      throw new Error(response.data?.msg || 'Failed to get Feishu tenant access token');
    }

    const expiresInSeconds = Number(response.data?.expire) || 7200;
    this.tenantAccessToken = {
      value: token,
      expiresAt: now + Math.max(expiresInSeconds - 300, 60) * 1000,
    };

    return token;
  }
}
