import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FileModule } from '~/modules/file/file.module';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { NotificationModule } from '~/modules/notification/notification.module';
import { TaskController } from './controllers/task.controller';
import { TaskListController } from './controllers/task-list.controller';
import { TaskAttachmentEntity } from './entities/task-attachment.entity';
import { TaskCheckItemEntity } from './entities/task-check-item.entity';
import { TaskCompletionEntity } from './entities/task-completion.entity';
import { TaskListEntity } from './entities/task-list.entity';
import { TaskEntity } from './entities/task.entity';
import { TaskListService } from './services/task-list.service';
import { TaskReminderService } from './services/task-reminder.service';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskEntity,
      TaskListEntity,
      TaskCompletionEntity,
      TaskAttachmentEntity,
      TaskCheckItemEntity,
      UserEntity,
      FileEntity,
    ]),
    FileModule,
    NotificationModule,
  ],
  controllers: [TaskController, TaskListController],
  providers: [TaskService, TaskListService, TaskReminderService],
  exports: [TaskService, TaskReminderService],
})
export class TaskModule {}
