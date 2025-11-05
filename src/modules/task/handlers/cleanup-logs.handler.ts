import { LoggerService } from '~/shared/logger/logger.service';
import { ITaskHandler } from '../interfaces/task-handler.interface';
import { TaskHandler } from '../decorators/task-handler.decorator';
import { TaskLogRepository } from '../repositories/task-log.repository';

/**
 * 系统内置：清理旧任务日志处理器
 *
 * 用途：定期清理过期的任务执行日志，释放存储空间
 * 功能：删除超过保留期限的任务日志
 *
 * 使用 @TaskHandler 装饰器，自动注册到任务调度系统
 */
@TaskHandler('system:cleanup-task-logs')
export class CleanupLogsHandler implements ITaskHandler {
  readonly name = 'system:cleanup-task-logs';
  readonly description = '清理旧任务日志';

  constructor(
    private readonly logger: LoggerService,
    private readonly taskLogRepository: TaskLogRepository,
  ) {
    this.logger.setContext(CleanupLogsHandler.name);
  }

  /**
   * 执行日志清理
   * @param payload 配置参数
   *  - retentionDays: 日志保留天数（默认：30天）
   */
  async execute(payload?: Record<string, unknown>): Promise<void> {
    const retentionDays = (payload?.retentionDays as number) || 30;

    this.logger.log(`🧹 Starting cleanup of task logs older than ${retentionDays} days`);

    const deletedCount = await this.taskLogRepository.cleanupOldLogs(retentionDays);

    this.logger.log(`✅ Cleanup completed: deleted ${deletedCount} old task log(s)`);
  }
}
