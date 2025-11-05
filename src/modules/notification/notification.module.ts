import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { UserModule } from '../user/user.module';
import { NotificationConnectionRegistry } from './registry/notification-connection.registry';
import { BarkChannelAdapter } from './channels/bark.channel';
import { FeishuChannelAdapter } from './channels/feishu.channel';
import { SmsChannelAdapter } from './channels/sms.channel';
import { NotificationChannelManager } from './channels/notification-channel.manager';
import { NOTIFICATION_CHANNEL_ADAPTERS } from './channels/notification-channel.tokens';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), UserModule, HttpModule],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    NotificationService,
    NotificationGateway,
    NotificationConnectionRegistry,
    BarkChannelAdapter,
    FeishuChannelAdapter,
    SmsChannelAdapter,
    {
      provide: NOTIFICATION_CHANNEL_ADAPTERS,
      useFactory: (
        bark: BarkChannelAdapter,
        feishu: FeishuChannelAdapter,
        sms: SmsChannelAdapter,
      ) => [bark, feishu, sms],
      inject: [BarkChannelAdapter, FeishuChannelAdapter, SmsChannelAdapter],
    },
    NotificationChannelManager,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
