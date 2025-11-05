/**
 * 任务处理器接口
 * 所有自定义任务处理器必须实现此接口
 */
export interface ITaskHandler {
  /**
   * Handler 名称（必须唯一，与数据库中的 handler 字段一致）
   */
  readonly name: string;

  /**
   * Handler 描述（可选）
   */
  readonly description?: string;

  /**
   * 执行任务
   * @param payload 任务载荷（从数据库的 payload 字段读取）
   * @returns Promise<void>
   */
  execute(payload?: Record<string, unknown>): Promise<void>;
}
