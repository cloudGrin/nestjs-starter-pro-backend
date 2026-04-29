import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { NotificationModule } from '~/modules/notification/notification.module';
import { TaskController } from './controllers/task.controller';
import { TaskListController } from './controllers/task-list.controller';
import { TaskCompletionEntity } from './entities/task-completion.entity';
import { TaskListEntity } from './entities/task-list.entity';
import { TaskEntity } from './entities/task.entity';
import { TaskListService } from './services/task-list.service';
import { TaskReminderService } from './services/task-reminder.service';
import { TaskService } from './services/task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity, TaskListEntity, TaskCompletionEntity, UserEntity]),
    NotificationModule,
  ],
  controllers: [TaskController, TaskListController],
  providers: [TaskService, TaskListService, TaskReminderService],
  exports: [TaskService, TaskReminderService],
})
export class TaskModule {}
