import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { UserModule } from '../user/user.module';
import { BarkChannelAdapter } from './channels/bark.channel';
import { FeishuChannelAdapter } from './channels/feishu.channel';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity]), UserModule, HttpModule],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    NotificationService,
    BarkChannelAdapter,
    FeishuChannelAdapter,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
