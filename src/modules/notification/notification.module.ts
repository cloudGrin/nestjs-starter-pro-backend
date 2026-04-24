import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { UserEntity } from '../user/entities/user.entity';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { BarkChannelAdapter } from './channels/bark.channel';
import { FeishuChannelAdapter } from './channels/feishu.channel';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, UserEntity]), HttpModule],
  controllers: [NotificationController],
  providers: [NotificationService, BarkChannelAdapter, FeishuChannelAdapter],
  exports: [NotificationService],
})
export class NotificationModule {}
