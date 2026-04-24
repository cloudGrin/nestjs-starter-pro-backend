import {
  MarkAllNotificationsReadResponseDto,
  MarkNotificationReadResponseDto,
} from './notification-read-response.dto';

describe('notification read response DTOs', () => {
  it('keeps single read response explicit', () => {
    expect(MarkNotificationReadResponseDto.success()).toEqual({
      message: '通知已标记为已读',
    });
  });

  it('keeps read-all response explicit with affected count', () => {
    expect(MarkAllNotificationsReadResponseDto.success(3)).toEqual({
      message: '所有通知已标记为已读',
      affected: 3,
    });
  });
});
