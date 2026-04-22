import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskDefinitionEntity } from './entities/task-definition.entity';
import { TaskLogEntity } from './entities/task-log.entity';
import { TaskDefinitionRepository } from './repositories/task-definition.repository';
import { TaskLogRepository } from './repositories/task-log.repository';
import { TaskService } from './services/task.service';
import { TaskController } from './controllers/task.controller';
import { TaskHandlerRegistry } from './services/task-handler.registry';
import { CleanupLogsHandler } from './handlers';

/**
 * 任务调度模块
 *
 * 只保留 cron 调度能力，Handler 显式注册到 TaskHandlerRegistry。
 * 对个人后台来说，这比自动发现/事件总线更容易理解和维护。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TaskDefinitionEntity, TaskLogEntity]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TaskController],
  providers: [
    TaskDefinitionRepository,
    TaskLogRepository,
    CleanupLogsHandler,
    {
      provide: TaskHandlerRegistry,
      useFactory: (cleanupLogsHandler: CleanupLogsHandler) => {
        const registry = new TaskHandlerRegistry();
        registry.register(cleanupLogsHandler.name, (payload) =>
          cleanupLogsHandler.execute(payload),
        );
        return registry;
      },
      inject: [CleanupLogsHandler],
    },
    TaskService,
  ],
  exports: [TaskService, TaskHandlerRegistry],
})
export class TaskModule {}
