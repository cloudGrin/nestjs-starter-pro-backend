import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class SnoozeTaskReminderDto {
  @ApiProperty({ description: '稍后提醒时间' })
  @IsDateString()
  snoozeUntil: string;
}
