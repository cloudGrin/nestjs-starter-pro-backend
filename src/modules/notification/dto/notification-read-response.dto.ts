import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationReadResponseDto {
  @ApiProperty()
  message: string;

  static success(): MarkNotificationReadResponseDto {
    return {
      message: '通知已标记为已读',
    };
  }
}

export class MarkAllNotificationsReadResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  affected: number;

  static success(affected: number): MarkAllNotificationsReadResponseDto {
    return {
      message: '所有通知已标记为已读',
      affected,
    };
  }
}
