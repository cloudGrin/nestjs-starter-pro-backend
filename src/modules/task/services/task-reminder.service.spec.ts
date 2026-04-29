import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationChannel,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';
import { NotificationService } from '~/modules/notification/services/notification.service';
import { TaskEntity, TaskStatus } from '../entities/task.entity';
import { TaskReminderService } from './task-reminder.service';

describe('TaskReminderService', () => {
  let service: TaskReminderService;
  let taskRepository: jest.Mocked<Repository<TaskEntity>>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const notificationServiceMock = {
      createNotification: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReminderService,
        { provide: getRepositoryToken(TaskEntity), useValue: createMockRepository<TaskEntity>() },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(TaskReminderService);
    taskRepository = module.get(getRepositoryToken(TaskEntity));
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends due task reminders through the existing notification service', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 3,
      title: '接孩子',
      description: '16:30 到校门口',
      status: TaskStatus.PENDING,
      creatorId: 1,
      assigneeId: 2,
      remindAt: now,
      reminderChannels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
      sendExternalReminder: true,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(1);
    expect(taskRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TaskStatus.PENDING,
          list: { isArchived: false },
        }),
        relations: ['list'],
      }),
    );
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '任务提醒：接孩子',
        content: '16:30 到校门口',
        recipientIds: [2],
        type: NotificationType.REMINDER,
        channels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
        sendExternal: true,
        metadata: expect.objectContaining({
          module: 'task',
          taskId: 3,
        }),
      }),
    );
    expect(taskRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3,
        status: TaskStatus.PENDING,
        remindedAt: expect.anything(),
      }),
      {
        remindedAt: now,
      },
    );
  });

  it('only scans tasks from active lists', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    taskRepository.find.mockResolvedValue([]);

    await service.sendDueReminders(now);

    expect(taskRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['list'],
        where: expect.objectContaining({
          list: { isArchived: false },
        }),
      }),
    );
  });

  it('always includes the internal channel once when normalizing reminder channels', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 8,
      title: '外部提醒',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
      reminderChannels: [
        NotificationChannel.BARK,
        NotificationChannel.INTERNAL,
        NotificationChannel.BARK,
      ],
      sendExternalReminder: true,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    await service.sendDueReminders(now);

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: [NotificationChannel.INTERNAL, NotificationChannel.BARK],
      }),
    );
  });

  it('falls back to the internal channel when reminder channels are empty', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 9,
      title: '站内提醒',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
      reminderChannels: [],
      sendExternalReminder: false,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    await service.sendDueReminders(now);

    expect(notificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: [NotificationChannel.INTERNAL],
      }),
    );
  });

  it('skips a reminder that was already claimed by another cron run', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 4,
      title: '接孩子',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.update.mockResolvedValue({ affected: 0 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(0);
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('skips a reminder when its list is archived after scanning but before delivery', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 7,
      title: '接孩子',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
      list: { isArchived: false },
    });
    const archivedTask = Object.assign(new TaskEntity(), {
      ...task,
      list: { isArchived: true },
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(archivedTask);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(0);
    expect(taskRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: ['list'],
    });
    expect(taskRepository.update).toHaveBeenLastCalledWith(7, { remindedAt: null });
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('skips a reminder when the task is completed after scanning but before delivery', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 10,
      title: '接孩子',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
      list: { isArchived: false },
    });
    const completedTask = Object.assign(new TaskEntity(), {
      ...task,
      status: TaskStatus.COMPLETED,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(completedTask);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(0);
    expect(taskRepository.update).toHaveBeenLastCalledWith(10, { remindedAt: null });
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('skips a reminder when the reminder time is moved to the future after scanning', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 11,
      title: '接孩子',
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
      list: { isArchived: false },
    });
    const rescheduledTask = Object.assign(new TaskEntity(), {
      ...task,
      remindAt: new Date('2026-05-01T10:00:00.000Z'),
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(rescheduledTask);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(0);
    expect(taskRepository.update).toHaveBeenLastCalledWith(11, { remindedAt: null });
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });

  it('truncates long notification titles to fit the notification title column', async () => {
    const now = new Date('2026-05-01T09:00:00.000Z');
    const task = Object.assign(new TaskEntity(), {
      id: 5,
      title: '很长的任务标题'.repeat(30),
      status: TaskStatus.PENDING,
      creatorId: 1,
      remindAt: now,
    });

    taskRepository.find.mockResolvedValue([task]);
    taskRepository.findOne.mockResolvedValue(task);
    taskRepository.update.mockResolvedValue({ affected: 1 } as any);

    const count = await service.sendDueReminders(now);

    expect(count).toBe(1);
    const payload = notificationService.createNotification.mock.calls[0][0];
    expect(payload.title.length).toBeLessThanOrEqual(150);
    expect(payload.title.startsWith('任务提醒：')).toBe(true);
  });
});
