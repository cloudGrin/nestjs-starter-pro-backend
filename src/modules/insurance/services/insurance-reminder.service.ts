import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import dayjs from 'dayjs';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationChannel,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';
import { NotificationService } from '~/modules/notification/services/notification.service';
import {
  InsurancePolicyReminderEntity,
  InsurancePolicyReminderType,
} from '../entities/insurance-policy-reminder.entity';

@Injectable()
export class InsuranceReminderService {
  constructor(
    @InjectRepository(InsurancePolicyReminderEntity)
    private readonly reminderRepository: Repository<InsurancePolicyReminderEntity>,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {}

  async sendDueReminders(now = new Date()): Promise<number> {
    const today = dayjs(now).format('YYYY-MM-DD');
    const reminders = await this.reminderRepository.find({
      where: {
        remindDate: LessThanOrEqual(today),
        sentAt: IsNull(),
      },
      relations: ['policy', 'policy.member'],
      order: { remindDate: 'ASC', id: 'ASC' },
    });

    let sent = 0;
    for (const reminder of reminders) {
      if (!reminder.policy) {
        await this.reminderRepository.update(reminder.id, {
          lastError: '保单不存在',
        });
        continue;
      }

      try {
        const notifications = await this.notificationService.createNotification({
          title: this.buildTitle(reminder),
          content: this.buildContent(reminder),
          recipientIds: [reminder.recipientUserId],
          type: NotificationType.REMINDER,
          channels: this.normalizeChannels(reminder.policy.reminderChannels),
          sendExternal: reminder.policy.sendExternalReminder,
          metadata: {
            module: 'insurance',
            policyId: reminder.policyId,
            reminderId: reminder.id,
            link: `/insurance?policyId=${reminder.policyId}`,
          },
        });

        await this.reminderRepository.update(reminder.id, {
          sentAt: now,
          notificationId: notifications[0]?.id ?? null,
          lastError: null,
        });
        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Send insurance reminder failed reminderId=${reminder.id}: ${message}`);
        await this.reminderRepository.update(reminder.id, {
          lastError: message.slice(0, 500),
        });
      }
    }

    return sent;
  }

  private buildTitle(reminder: InsurancePolicyReminderEntity): string {
    const policyName = reminder.policy?.name ?? `保单 #${reminder.policyId}`;
    if (
      reminder.reminderType === InsurancePolicyReminderType.PAYMENT_7D ||
      reminder.reminderType === InsurancePolicyReminderType.PAYMENT_DUE
    ) {
      return `保险缴费提醒：${policyName}`.slice(0, 150);
    }

    return `保险到期提醒：${policyName}`.slice(0, 150);
  }

  private buildContent(reminder: InsurancePolicyReminderEntity): string {
    const policy = reminder.policy;
    const memberName = policy?.member?.name ? `成员：${policy.member.name}` : undefined;
    const company = policy?.company ? `保险公司：${policy.company}` : undefined;
    const dateText =
      reminder.reminderType === InsurancePolicyReminderType.PAYMENT_7D ||
      reminder.reminderType === InsurancePolicyReminderType.PAYMENT_DUE
        ? `缴费日：${policy?.nextPaymentDate ?? '-'}`
        : `到期日：${policy?.endDate ?? '-'}`;

    return (
      [memberName, company, dateText].filter(Boolean).join('\n') || reminder.policy?.name || ''
    );
  }

  private normalizeChannels(channels?: NotificationChannel[] | null): NotificationChannel[] {
    const list = channels && channels.length > 0 ? channels : [NotificationChannel.INTERNAL];
    return Array.from(new Set([NotificationChannel.INTERNAL, ...list]));
  }
}
