import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FileModule } from '~/modules/file/file.module';
import { NotificationModule } from '~/modules/notification/notification.module';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { UserModule } from '~/modules/user/user.module';
import { FamilyChatController } from './controllers/family-chat.controller';
import { FamilyMediaController } from './controllers/family-media.controller';
import { FamilyPostController } from './controllers/family-post.controller';
import { FamilyStateController } from './controllers/family-state.controller';
import {
  FamilyChatMessageEntity,
  FamilyChatMessageMediaEntity,
  FamilyPostCommentEntity,
  FamilyPostEntity,
  FamilyPostLikeEntity,
  FamilyPostMediaEntity,
  FamilyReadStateEntity,
} from './entities';
import { FamilyGateway } from './gateways/family.gateway';
import { FamilyEventService } from './services/family-event.service';
import { FamilyReadStateService } from './services/family-read-state.service';
import { FamilyService } from './services/family.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FamilyPostEntity,
      FamilyPostMediaEntity,
      FamilyPostCommentEntity,
      FamilyPostLikeEntity,
      FamilyChatMessageEntity,
      FamilyChatMessageMediaEntity,
      FamilyReadStateEntity,
      FileEntity,
      UserEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
      }),
    }),
    FileModule,
    NotificationModule,
    UserModule,
  ],
  controllers: [
    FamilyPostController,
    FamilyChatController,
    FamilyMediaController,
    FamilyStateController,
  ],
  providers: [FamilyService, FamilyReadStateService, FamilyGateway, FamilyEventService],
  exports: [FamilyService, FamilyReadStateService],
})
export class FamilyModule {}
