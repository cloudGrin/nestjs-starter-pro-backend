import { LoggerService } from '~/shared/logger/logger.service';
import { ITaskHandler } from '../interfaces/task-handler.interface';
import { TaskHandler } from '../decorators/task-handler.decorator';

/**
 * 发送邮件任务处理器（演示）
 *
 * 用途：演示如何创建邮件发送任务处理器
 * 功能：模拟邮件发送操作
 *
 * 使用 @TaskHandler 装饰器，自动注册到任务调度系统
 */
@TaskHandler('SendEmailHandler')
export class SendEmailHandler implements ITaskHandler {
  readonly name = 'SendEmailHandler';
  readonly description = '发送邮件任务处理器';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(SendEmailHandler.name);
  }

  /**
   * 执行邮件发送
   * @param payload 配置参数
   *  - to: 收件人邮箱（必填）
   *  - subject: 邮件主题（必填）
   *  - content: 邮件内容（必填）
   *  - cc: 抄送人（可选）
   *  - attachments: 附件列表（可选）
   */
  async execute(payload?: Record<string, unknown>): Promise<void> {
    // 参数验证
    const to = payload?.to as string;
    const subject = payload?.subject as string;
    const content = payload?.content as string;
    const cc = payload?.cc as string | undefined;
    const attachments = payload?.attachments as string[] | undefined;

    if (!to) {
      throw new Error('Missing required parameter: to');
    }
    if (!subject) {
      throw new Error('Missing required parameter: subject');
    }
    if (!content) {
      throw new Error('Missing required parameter: content');
    }

    this.logger.log(`📧 Starting to send email...`);
    this.logger.log(`   To: ${to}`);
    this.logger.log(`   Subject: ${subject}`);
    if (cc) {
      this.logger.log(`   CC: ${cc}`);
    }
    if (attachments && attachments.length > 0) {
      this.logger.log(`   Attachments: ${attachments.join(', ')}`);
    }

    // 模拟邮件发送过程（实际项目中这里会调用邮件服务）
    // 例如：使用 nodemailer、SendGrid、阿里云邮件推送等
    await this.simulateEmailSending();

    // 模拟邮件发送统计
    const stats = {
      to,
      subject,
      contentLength: content.length,
      hasCc: !!cc,
      attachmentCount: attachments?.length || 0,
      sentAt: new Date().toISOString(),
      provider: 'MockMailService',
      messageId: `<${Date.now()}@home.example.com>`,
    };

    this.logger.log(`✅ Email sent successfully`);
    this.logger.log(`📊 Email statistics: ${JSON.stringify(stats, null, 2)}`);
  }

  /**
   * 模拟邮件发送操作（耗时1.5秒）
   */
  private async simulateEmailSending(): Promise<void> {
    this.logger.log('⏳ Connecting to mail server...');
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.logger.log('⏳ Sending email...');
    await new Promise((resolve) => setTimeout(resolve, 800));

    this.logger.log('⏳ Verifying delivery...');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
