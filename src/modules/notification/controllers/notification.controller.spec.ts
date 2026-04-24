import { readFileSync } from 'fs';
import { join } from 'path';

describe('NotificationController', () => {
  it('uses response DTOs for read command responses', () => {
    const source = readFileSync(join(__dirname, 'notification.controller.ts'), 'utf8');

    expect(source).toContain('MarkNotificationReadResponseDto');
    expect(source).toContain('MarkAllNotificationsReadResponseDto');
    expect(source).not.toContain("return { message: '通知已标记为已读' }");
    expect(source).not.toContain("message: '所有通知已标记为已读'");
  });
});
