import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DiscoveryModule } from '@nestjs/core';
import { TaskDefinitionEntity } from './entities/task-definition.entity';
import { TaskLogEntity } from './entities/task-log.entity';
import { TaskDefinitionRepository } from './repositories/task-definition.repository';
import { TaskLogRepository } from './repositories/task-log.repository';
import { TaskService } from './services/task.service';
import { TaskController } from './controllers/task.controller';
import { TaskHandlerRegistry } from './services/task-handler.registry';
import { TaskHandlerDiscoveryService } from './services/task-handler-discovery.service';
import { CleanupLogsHandler, DataBackupHandler, SendEmailHandler } from './handlers';

/**
 * 任务调度模块
 *
 * 架构设计（装饰器自动注册）：
 *
 * 1. TaskService
 *    - 负责任务的调度和执行流程
 *    - 不包含业务逻辑
 *
 * 2. TaskHandlerRegistry
 *    - 管理所有 Handler 的注册表
 *    - 提供 get/register 方法
 *
 * 3. TaskHandlerDiscoveryService
 *    - 自动扫描所有标记了 @TaskHandler 的类
 *    - 自动注册到 TaskHandlerRegistry
 *    - 完全解耦，无需手动维护
 *
 * 4. Handler 类
 *    - 使用 @TaskHandler('HandlerName') 装饰器
 *    - 实现 ITaskHandler 接口
 *    - 可以依赖注入任何服务
 *
 * 如何添加新 Handler：
 * 1. 创建 Handler 类，使用 @TaskHandler 装饰器
 * 2. 在 providers 中添加该类
 * 3. 完成！无需其他修改
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TaskDefinitionEntity, TaskLogEntity]),
    ScheduleModule.forRoot(),
    DiscoveryModule, // 用于扫描标记了装饰器的类
  ],
  controllers: [TaskController],
  providers: [
    TaskDefinitionRepository,
    TaskLogRepository,
    TaskHandlerRegistry,
    TaskHandlerDiscoveryService, // 自动发现和注册 Handler
    TaskService,
    // 所有 Handler（使用 @TaskHandler 装饰器）
    CleanupLogsHandler, // 系统内置
    DataBackupHandler, // 演示示例
    SendEmailHandler, // 邮件发送示例
    // 新增 Handler 时，只需在这里添加，无需其他修改
  ],
  exports: [TaskService, TaskHandlerRegistry],
})
export class TaskModule {}
