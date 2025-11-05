import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { TaskHandlerRegistry } from './task-handler.registry';
import { TASK_HANDLER_METADATA } from '../decorators/task-handler.decorator';
import { ITaskHandler } from '../interfaces/task-handler.interface';

/**
 * 任务处理器发现服务
 *
 * 功能：
 * 1. 自动扫描所有标记了 @TaskHandler 装饰器的类
 * 2. 自动注册到 TaskHandlerRegistry
 * 3. 完全解耦，无需手动维护 Handler 列表
 *
 * 工作原理：
 * 1. 模块初始化时，扫描所有 Provider
 * 2. 检查 Provider 是否有 TASK_HANDLER_METADATA 元数据
 * 3. 如果有，则自动注册到 Registry
 */
@Injectable()
export class TaskHandlerDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(TaskHandlerDiscoveryService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly handlerRegistry: TaskHandlerRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    this.discoverHandlers();
  }

  /**
   * 发现并注册所有任务处理器
   */
  private discoverHandlers(): void {
    // 获取所有 Provider
    const providers: InstanceWrapper[] = this.discoveryService.getProviders();

    let registeredCount = 0;

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      // 检查是否有 @TaskHandler 装饰器
      const handlerName = this.reflector.get<string>(
        TASK_HANDLER_METADATA,
        instance.constructor,
      );

      if (!handlerName) {
        continue;
      }

      // 验证是否实现了 ITaskHandler 接口
      const handler = instance as ITaskHandler;
      if (typeof handler.execute !== 'function') {
        this.logger.warn(
          `Handler ${handlerName} does not implement ITaskHandler.execute()`,
        );
        continue;
      }

      // 注册到 Registry
      this.handlerRegistry.register(handlerName, handler.execute.bind(handler));

      this.logger.log(`✅ Registered handler: ${handlerName}`);
      registeredCount++;
    }

    this.logger.log(`🎉 Handler discovery completed: ${registeredCount} handler(s) registered`);
  }
}
