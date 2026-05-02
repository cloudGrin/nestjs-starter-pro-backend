import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { NotificationChannel } from '~/modules/notification/entities/notification.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FileService } from '~/modules/file/services/file.service';
import { InsuranceMemberEntity } from '../entities/insurance-member.entity';
import { InsurancePolicyEntity, InsurancePolicyType } from '../entities/insurance-policy.entity';
import {
  InsurancePolicyReminderEntity,
  InsurancePolicyReminderType,
} from '../entities/insurance-policy-reminder.entity';
import { InsurancePolicyAttachmentEntity } from '../entities/insurance-policy-attachment.entity';
import { InsurancePolicyService } from './insurance-policy.service';

describe('InsurancePolicyService', () => {
  let service: InsurancePolicyService;
  let memberRepository: jest.Mocked<Repository<InsuranceMemberEntity>>;
  let policyRepository: jest.Mocked<Repository<InsurancePolicyEntity>>;
  let attachmentRepository: jest.Mocked<Repository<InsurancePolicyAttachmentEntity>>;
  let reminderRepository: jest.Mocked<Repository<InsurancePolicyReminderEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let fileRepository: jest.Mocked<Repository<FileEntity>>;
  let fileService: jest.Mocked<FileService>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-01T00:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsurancePolicyService,
        {
          provide: getRepositoryToken(InsuranceMemberEntity),
          useValue: createMockRepository<InsuranceMemberEntity>(),
        },
        {
          provide: getRepositoryToken(InsurancePolicyEntity),
          useValue: createMockRepository<InsurancePolicyEntity>(),
        },
        {
          provide: getRepositoryToken(InsurancePolicyAttachmentEntity),
          useValue: createMockRepository<InsurancePolicyAttachmentEntity>(),
        },
        {
          provide: getRepositoryToken(InsurancePolicyReminderEntity),
          useValue: createMockRepository<InsurancePolicyReminderEntity>(),
        },
        { provide: getRepositoryToken(UserEntity), useValue: createMockRepository<UserEntity>() },
        { provide: getRepositoryToken(FileEntity), useValue: createMockRepository<FileEntity>() },
        {
          provide: FileService,
          useValue: {
            getDownloadStream: jest.fn(),
          },
        },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(InsurancePolicyService);
    memberRepository = module.get(getRepositoryToken(InsuranceMemberEntity));
    policyRepository = module.get(getRepositoryToken(InsurancePolicyEntity));
    attachmentRepository = module.get(getRepositoryToken(InsurancePolicyAttachmentEntity));
    reminderRepository = module.get(getRepositoryToken(InsurancePolicyReminderEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
    fileRepository = module.get(getRepositoryToken(FileEntity));
    fileService = module.get(FileService);

    policyRepository.create.mockImplementation((data) => data as InsurancePolicyEntity);
    policyRepository.save.mockImplementation(async (data) =>
      Object.assign(new InsurancePolicyEntity(), data, { id: 88 }),
    );
    attachmentRepository.create.mockImplementation(
      (data) => data as InsurancePolicyAttachmentEntity,
    );
    reminderRepository.create.mockImplementation((data) => data as InsurancePolicyReminderEntity);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('creates policy reminders for expiry and payment milestones', async () => {
    memberRepository.findOne.mockResolvedValue(
      Object.assign(new InsuranceMemberEntity(), { id: 3 }),
    );
    userRepository.findOne.mockResolvedValue(Object.assign(new UserEntity(), { id: 7 }));
    fileRepository.find.mockResolvedValue([Object.assign(new FileEntity(), { id: 21 })]);

    const policy = await service.createPolicy(
      {
        name: '家庭百万医疗',
        company: '平安保险',
        policyNo: 'P-2026-001',
        memberId: 3,
        type: InsurancePolicyType.MEDICAL,
        effectiveDate: '2026-05-10',
        endDate: '2026-12-31',
        nextPaymentDate: '2026-08-15',
        paymentAmount: 1200,
        ownerUserId: 7,
        reminderChannels: [NotificationChannel.BARK],
        attachmentFileIds: [21],
      },
      { id: 1 } as any,
    );

    expect(policy.id).toBe(88);
    expect(policy.sendExternalReminder).toBe(true);
    expect(attachmentRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ policyId: 88, fileId: 21, sort: 0 }),
    ]);
    expect(reminderRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          policyId: 88,
          reminderType: InsurancePolicyReminderType.EXPIRY_30D,
          remindDate: '2026-12-01',
          recipientUserId: 7,
        }),
        expect.objectContaining({
          policyId: 88,
          reminderType: InsurancePolicyReminderType.EXPIRY_7D,
          remindDate: '2026-12-24',
          recipientUserId: 7,
        }),
        expect.objectContaining({
          policyId: 88,
          reminderType: InsurancePolicyReminderType.PAYMENT_7D,
          remindDate: '2026-08-08',
          recipientUserId: 7,
        }),
        expect.objectContaining({
          policyId: 88,
          reminderType: InsurancePolicyReminderType.PAYMENT_DUE,
          remindDate: '2026-08-15',
          recipientUserId: 7,
        }),
      ]),
    );
  });

  it('rejects unknown attachment ids before saving a policy', async () => {
    memberRepository.findOne.mockResolvedValue(
      Object.assign(new InsuranceMemberEntity(), { id: 3 }),
    );
    userRepository.findOne.mockResolvedValue(Object.assign(new UserEntity(), { id: 7 }));
    fileRepository.find.mockResolvedValue([]);

    await expect(
      service.createPolicy(
        {
          name: '家庭百万医疗',
          memberId: 3,
          type: InsurancePolicyType.MEDICAL,
          ownerUserId: 7,
          attachmentFileIds: [404],
        },
        { id: 1 } as any,
      ),
    ).rejects.toThrow(BusinessException);
    expect(policyRepository.save).not.toHaveBeenCalled();
  });

  it('derives external reminder delivery from selected policy reminder channels', async () => {
    memberRepository.findOne.mockResolvedValue(
      Object.assign(new InsuranceMemberEntity(), { id: 3 }),
    );
    userRepository.findOne.mockResolvedValue(Object.assign(new UserEntity(), { id: 7 }));

    const policy = await service.createPolicy(
      {
        name: '家庭百万医疗',
        memberId: 3,
        type: InsurancePolicyType.MEDICAL,
        ownerUserId: 7,
        reminderChannels: [NotificationChannel.INTERNAL],
        sendExternalReminder: true,
      } as any,
      { id: 1 } as any,
    );

    expect(policy.reminderChannels).toEqual([NotificationChannel.INTERNAL]);
    expect(policy.sendExternalReminder).toBe(false);
  });

  it('rebuilds pending reminders when the policy owner changes', async () => {
    policyRepository.findOne.mockResolvedValue(
      Object.assign(new InsurancePolicyEntity(), {
        id: 88,
        name: '家庭百万医疗',
        memberId: 3,
        type: InsurancePolicyType.MEDICAL,
        ownerUserId: 7,
        endDate: '2026-12-31',
        nextPaymentDate: '2026-08-15',
        reminderChannels: [NotificationChannel.INTERNAL],
        sendExternalReminder: false,
        reminders: [],
      }),
    );
    userRepository.findOne.mockResolvedValue(Object.assign(new UserEntity(), { id: 9 }));
    policyRepository.save.mockImplementationOnce(async (data) => data as InsurancePolicyEntity);

    await service.updatePolicy(88, { ownerUserId: 9 });

    expect(reminderRepository.delete).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: 88 }),
    );
    expect(reminderRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          reminderType: InsurancePolicyReminderType.EXPIRY_30D,
          recipientUserId: 9,
        }),
        expect.objectContaining({
          reminderType: InsurancePolicyReminderType.PAYMENT_DUE,
          recipientUserId: 9,
        }),
      ]),
    );
  });

  it('does not recreate reminders that have already been sent', async () => {
    policyRepository.findOne.mockResolvedValue(
      Object.assign(new InsurancePolicyEntity(), {
        id: 88,
        name: '家庭百万医疗',
        memberId: 3,
        type: InsurancePolicyType.MEDICAL,
        ownerUserId: 7,
        endDate: '2026-12-31',
        nextPaymentDate: '2026-08-15',
        reminderChannels: [NotificationChannel.INTERNAL],
        sendExternalReminder: false,
        reminders: [
          Object.assign(new InsurancePolicyReminderEntity(), {
            policyId: 88,
            reminderType: InsurancePolicyReminderType.PAYMENT_DUE,
            remindDate: '2026-08-15',
            sentAt: new Date('2026-08-15T00:00:00.000Z'),
          }),
        ],
      }),
    );
    policyRepository.save.mockImplementationOnce(async (data) => data as InsurancePolicyEntity);

    await service.updatePolicy(88, {
      reminderChannels: [NotificationChannel.BARK],
    });

    expect(policyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderChannels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
        sendExternalReminder: true,
      }),
    );
    const savedReminders = reminderRepository.save.mock
      .calls[0][0] as InsurancePolicyReminderEntity[];
    expect(savedReminders).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reminderType: InsurancePolicyReminderType.PAYMENT_DUE,
          remindDate: '2026-08-15',
        }),
      ]),
    );
  });

  it('rejects attachment downloads when the policy has been soft-deleted', async () => {
    policyRepository.findOne.mockResolvedValue(null);
    attachmentRepository.findOne.mockResolvedValue(
      Object.assign(new InsurancePolicyAttachmentEntity(), {
        policyId: 88,
        fileId: 21,
        file: Object.assign(new FileEntity(), { id: 21 }),
      }),
    );

    await expect(service.getAttachmentDownload(88, 21)).rejects.toThrow(BusinessException);
    expect(attachmentRepository.findOne).not.toHaveBeenCalled();
    expect(fileService.getDownloadStream).not.toHaveBeenCalled();
  });
});
