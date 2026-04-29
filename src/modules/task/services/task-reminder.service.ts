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
          remindAt: LessThanOrEqual(now),
          remindedAt: IsNull(),
        } as any,
        { remindedAt: now },
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
        await this.taskRepository.update(task.id, { remindedAt: null });
        continue;
      }

      if (!this.isStillDueForReminder(claimedTask, now)) {
        await this.taskRepository.update(task.id, { remindedAt: null });
        continue;
      }

      const claimedRecipientId = claimedTask.assigneeId ?? claimedTask.creatorId;
      if (!claimedRecipientId) {
        this.logger.warn(`Skip task reminder without recipient taskId=${claimedTask.id}`);
        await this.taskRepository.update(task.id, { remindedAt: null });
        continue;
      }

      try {
        await this.notificationService.createNotification({
          title: this.buildReminderTitle(claimedTask.title),
          content: claimedTask.description || claimedTask.title,
          recipientIds: [claimedRecipientId],
          type: NotificationType.REMINDER,
          channels: this.normalizeChannels(claimedTask.reminderChannels),
          sendExternal: claimedTask.sendExternalReminder,
          metadata: {
            module: 'task',
            taskId: claimedTask.id,
            link: `/tasks?taskId=${claimedTask.id}`,
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
    return Array.from(new Set([NotificationChannel.INTERNAL, ...list]));
  }

  private isStillDueForReminder(task: TaskEntity, now: Date): boolean {
    if (task.status !== TaskStatus.PENDING || !task.remindAt) {
      return false;
    }

    return task.remindAt.getTime() <= now.getTime();
  }
}
