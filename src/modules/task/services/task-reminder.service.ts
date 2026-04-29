import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import {
  NotificationChannel,
  NotificationType,
} from '~/modules/notification/entities/notification.entity';
import { NotificationService } from '~/modules/notification/services/notification.service';
import { TaskEntity, TaskStatus } from '../entities/task.entity';

const NOTIFICATION_TITLE_MAX_LENGTH = 150;

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
        remindAt: LessThanOrEqual(now),
        remindedAt: IsNull(),
      },
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
          remindAt: LessThanOrEqual(now),
          remindedAt: IsNull(),
        } as any,
        { remindedAt: now },
      );

      if (!claim.affected) {
        continue;
      }

      try {
        await this.notificationService.createNotification({
          title: this.buildReminderTitle(task.title),
          content: task.description || task.title,
          recipientIds: [recipientId],
          type: NotificationType.REMINDER,
          channels: this.normalizeChannels(task.reminderChannels),
          sendExternal: task.sendExternalReminder,
          metadata: {
            module: 'task',
            taskId: task.id,
            link: `/tasks?taskId=${task.id}`,
          },
        });

        sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Send task reminder failed taskId=${task.id}: ${message}`);
        await this.taskRepository.update(task.id, { remindedAt: null });
      }
    }

    return sent;
  }

  private buildReminderTitle(taskTitle: string): string {
    return `任务提醒：${taskTitle}`.slice(0, NOTIFICATION_TITLE_MAX_LENGTH);
  }

  private normalizeChannels(channels?: NotificationChannel[] | null): NotificationChannel[] {
    const list = channels && channels.length > 0 ? [...channels] : [NotificationChannel.INTERNAL];

    if (!list.includes(NotificationChannel.INTERNAL)) {
      list.unshift(NotificationChannel.INTERNAL);
    }

    return Array.from(new Set(list));
  }
}
