import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '~/modules/auth/auth.module';
import { CronService } from './cron.service';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  providers: [CronService],
})
export class CronModule {}
