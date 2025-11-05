import { Injectable, Logger } from '@nestjs/common';

export type TaskHandler = (payload?: Record<string, unknown>) => Promise<void> | void;

@Injectable()
export class TaskHandlerRegistry {
  private readonly logger = new Logger(TaskHandlerRegistry.name);
  private readonly handlers = new Map<string, TaskHandler>();

  register(handlerName: string, handler: TaskHandler): void {
    if (this.handlers.has(handlerName)) {
      this.logger.warn(`Handler ${handlerName} already registered, overriding`);
    }
    this.handlers.set(handlerName, handler);
  }

  get(handlerName?: string): TaskHandler | undefined {
    if (!handlerName) {
      return undefined;
    }
    return this.handlers.get(handlerName);
  }
}
