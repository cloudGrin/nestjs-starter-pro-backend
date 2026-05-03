import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationChannel,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';
import { NotificationService } from '~/modules/notification/services/notification.service';
import { InsuranceMemberEntity } from '../entities/insurance-member.entity';
import { InsurancePolicyEntity, InsurancePolicyType } from '../entities/insurance-policy.entity';
import {
  InsurancePolicyReminderEntity,
  InsurancePolicyReminderType,
} from '../entities/insurance-policy-reminder.entity';
import { InsuranceReminderService } from './insurance-reminder.service';

describe('InsuranceReminderService', () => {
  let service: InsuranceReminderService;
  let reminderRepository: jest.Mocked<Repository<InsurancePolicyReminderEntity>>;
  let notificationService: jest.Mocked<Pick<NotificationService, 'createNotification'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceReminderService,
        {
          provide: getRepositoryToken(InsurancePolicyReminderEntity),
          useValue: createMockRepository<InsurancePolicyReminderEntity>(),
        },
        {
          provide: NotificationService,
          useValue: {
            createNotification: jest.fn(),
          },
        },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(InsuranceReminderService);
    reminderRepository = module.get(getRepositoryToken(InsurancePolicyReminderEntity));
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends due insurance reminders and marks them as sent', async () => {
    const now = new Date('2026-08-08T08:00:00.000Z');
    const reminder = Object.assign(new InsurancePolicyReminderEntity(), {
      id: 11,
      policyId: 88,
      reminderType: InsurancePolicyReminderType.PAYMENT_7D,
      remindDate: '2026-08-08',
      recipientUserId: 7,
      policy: Object.assign(new InsurancePolicyEntity(), {
        id: 88,
        name: '家庭百万医疗',
        company: '平安保险',
        type: InsurancePolicyType.MEDICAL,
        endDate: '2026-12-31',
        nextPaymentDate: '2026-08-15',
        member: Object.assign(new InsuranceMemberEntity(), { name: '妈妈' }),
      }),
    });
    reminderRepository.find.mockResolvedValue([reminder]);
    reminderRepository.update.mockResolvedValue({ affected: 1 } as any);
    notificationService.createNotification.mockResolvedValue([{ id: 101 }] as any);

    const sent = await service.sendDueReminders(now);

    expect(sent).toBe(1);
    expect(reminderRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          remindDate: LessThanOrEqual('2026-08-08'),
          sentAt: IsNull(),
        },
        relations: ['policy', 'policy.member'],
      }),
    );
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '保险缴费提醒：家庭百万医疗',
        recipientIds: [7],
        type: NotificationType.REMINDER,
        channels: [
          NotificationChannel.INTERNAL,
          NotificationChannel.BARK,
          NotificationChannel.FEISHU,
        ],
        sendExternal: true,
        metadata: {
          module: 'insurance',
          policyId: 88,
          reminderId: 11,
          link: '/insurance?policyId=88',
          mobileLink: '/m/insurance/88',
        },
      }),
    );
    expect(reminderRepository.update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        sentAt: now,
        notificationId: 101,
        lastError: null,
      }),
    );
  });

  it('keeps reminders unsent when notification delivery fails', async () => {
    const now = new Date('2026-12-24T08:00:00.000Z');
    reminderRepository.find.mockResolvedValue([
      Object.assign(new InsurancePolicyReminderEntity(), {
        id: 12,
        policyId: 89,
        reminderType: InsurancePolicyReminderType.EXPIRY_7D,
        remindDate: '2026-12-24',
        recipientUserId: 7,
        policy: Object.assign(new InsurancePolicyEntity(), {
          id: 89,
          name: '重疾险',
          type: InsurancePolicyType.CRITICAL_ILLNESS,
        }),
      }),
    ]);
    notificationService.createNotification.mockRejectedValue(new Error('channel failed'));

    const sent = await service.sendDueReminders(now);

    expect(sent).toBe(0);
    expect(reminderRepository.update).toHaveBeenCalledWith(12, {
      lastError: 'channel failed',
    });
  });
});
