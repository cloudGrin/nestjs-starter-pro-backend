import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FileModule } from '~/modules/file/file.module';
import { NotificationModule } from '~/modules/notification/notification.module';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { InsuranceMemberController } from './controllers/insurance-member.controller';
import { InsurancePolicyController } from './controllers/insurance-policy.controller';
import { InsuranceMemberEntity } from './entities/insurance-member.entity';
import { InsurancePolicyAttachmentEntity } from './entities/insurance-policy-attachment.entity';
import { InsurancePolicyReminderEntity } from './entities/insurance-policy-reminder.entity';
import { InsurancePolicyEntity } from './entities/insurance-policy.entity';
import { InsuranceMemberService } from './services/insurance-member.service';
import { InsurancePolicyService } from './services/insurance-policy.service';
import { InsuranceReminderService } from './services/insurance-reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsuranceMemberEntity,
      InsurancePolicyEntity,
      InsurancePolicyAttachmentEntity,
      InsurancePolicyReminderEntity,
      UserEntity,
      FileEntity,
    ]),
    FileModule,
    NotificationModule,
  ],
  controllers: [InsuranceMemberController, InsurancePolicyController],
  providers: [InsuranceMemberService, InsurancePolicyService, InsuranceReminderService],
  exports: [InsuranceReminderService],
})
export class InsuranceModule {}
