import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationChannel,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';
import { NotificationService } from '~/modules/notification/services/notification.service';
import { TaskEntity, TaskStatus } from '../entities/task.entity';

const NOTIFICATION_TITLE_MAX_LENGTH = 150;
const DEFAULT_CONTINUOUS_REMINDER_INTERVAL_MINUTES = 30;
const ALL_REMINDER_CHANNELS = [
  NotificationChannel.INTERNAL,
  NotificationChannel.BARK,
  NotificationChannel.FEISHU,
];

@Injectable()
export class TaskReminderService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {}

  async sendDueReminders(now = new Date()): Promise<number> {
    const tasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.PENDING,
        nextReminderAt: LessThanOrEqual(now),
        list: { isArchived: false },
      },
      relations: ['list'],
    });

    let sent = 0;

    for (const task of tasks) {
      const recipientId = task.assigneeId ?? task.creatorId;
      if (!recipientId) {
        this.logger.warn(`Skip task reminder without recipient taskId=${task.id}`);
        continue;
      }

      const claim = await this.taskRepository.update(
        {
          id: task.id,
          status: TaskStatus.PENDING,
          nextReminderAt: LessThanOrEqual(now),
        } as any,
        { remindedAt: now, nextReminderAt: null },
      );

      if (!claim.affected) {
        continue;
      }

      const claimedTask = await this.taskRepository.findOne({
        where: { id: task.id },
        relations: ['list'],
      });
      if (!claimedTask) {
        continue;
      }

      if (claimedTask.list?.isArchived) {
        await this.taskRepository.update(task.id, { remindedAt: null, nextReminderAt: null });
        continue;
      }

      if (!this.isStillDueForReminder(claimedTask, now)) {
        await this.taskRepository.update(task.id, {
          remindedAt: null,
          nextReminderAt: this.getRestoredNextReminderAt(claimedTask, now),
        });
        continue;
      }

      const claimedRecipientId = claimedTask.assigneeId ?? claimedTask.creatorId;
      if (!claimedRecipientId) {
        this.logger.warn(`Skip task reminder without recipient taskId=${claimedTask.id}`);
        await this.taskRepository.update(task.id, { remindedAt: null, nextReminderAt: null });
        continue;
      }

      try {
        await this.notificationService.createNotification({
          title: this.buildReminderTitle(claimedTask.title),
          content: claimedTask.description || claimedTask.title,
          recipientIds: [claimedRecipientId],
          type: NotificationType.REMINDER,
          channels: ALL_REMINDER_CHANNELS,
          sendExternal: true,
          metadata: {
            module: 'task',
            taskId: claimedTask.id,
            link: `/tasks?taskId=${claimedTask.id}`,
            mobileLink: `/m/tasks/${claimedTask.id}`,
          },
        });

        sent += 1;
        await this.taskRepository.update(task.id, {
          remindedAt: now,
          nextReminderAt: this.getNextReminderAfterDelivery(claimedTask, now),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Send task reminder failed taskId=${task.id}: ${message}`);
        await this.taskRepository.update(task.id, {
          remindedAt: null,
          nextReminderAt: this.getRestoredNextReminderAt(claimedTask, now),
        });
      }
    }

    return sent;
  }

  private buildReminderTitle(taskTitle: string): string {
    return `任务提醒：${taskTitle}`.slice(0, NOTIFICATION_TITLE_MAX_LENGTH);
  }

  private isStillDueForReminder(task: TaskEntity, now: Date): boolean {
    if (task.status !== TaskStatus.PENDING || !task.remindAt) {
      return false;
    }

    return task.remindAt.getTime() <= now.getTime();
  }

  private getNextReminderAfterDelivery(task: TaskEntity, now: Date): Date | null {
    if (!task.continuousReminderEnabled || !task.remindAt) {
      return null;
    }

    const interval = Math.max(
      task.continuousReminderIntervalMinutes ?? DEFAULT_CONTINUOUS_REMINDER_INTERVAL_MINUTES,
      1,
    );
    return new Date(now.getTime() + interval * 60 * 1000);
  }

  private getRestoredNextReminderAt(task: TaskEntity, now: Date): Date | null {
    if (task.status !== TaskStatus.PENDING || !task.remindAt) {
      return null;
    }

    if (task.remindAt.getTime() > now.getTime()) {
      return task.remindAt;
    }

    return task.nextReminderAt ?? task.remindAt;
  }
}
