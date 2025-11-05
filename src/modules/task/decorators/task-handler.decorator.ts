import { Injectable, SetMetadata } from '@nestjs/common';

/**
 * 任务处理器元数据的 key
 */
export const TASK_HANDLER_METADATA = 'task:handler';

/**
 * 任务处理器装饰器
 *
 * 用法：
 * ```typescript
 * @TaskHandler('DataBackupHandler')
 * export class DataBackupHandler implements ITaskHandler {
 *   async execute(payload?: Record<string, unknown>): Promise<void> {
 *     // 你的业务逻辑
 *   }
 * }
 * ```
 *
 * 优势：
 * 1. 自动注册：无需手动在 TaskModule 中添加
 * 2. 解耦：Handler 和 Module 完全解耦
 * 3. 类型安全：编译时检查 Handler 名称
 */
export function TaskHandler(name: string): ClassDecorator {
  return (target: any) => {
    // 1. 标记为 Injectable（自动注入到容器）
    Injectable()(target);

    // 2. 设置元数据（用于扫描和注册）
    SetMetadata(TASK_HANDLER_METADATA, name)(target);

    // 3. 在类上添加静态属性（便于访问）
    target.handlerName = name;
  };
}
