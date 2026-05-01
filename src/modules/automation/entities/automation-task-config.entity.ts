import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';

export enum AutomationTaskLastStatus {
  NEVER = 'never',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('automation_task_configs')
@Index(['enabled'])
export class AutomationTaskConfigEntity extends BaseEntity {
  @Column({
    name: 'task_key',
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '任务唯一编码',
  })
  taskKey: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用定时执行',
  })
  enabled: boolean;

  @Column({
    name: 'cron_expression',
    type: 'varchar',
    length: 120,
    comment: 'Cron 表达式',
  })
  cronExpression: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '任务参数',
  })
  params?: Record<string, unknown> | null;

  @Column({
    name: 'is_running',
    type: 'boolean',
    default: false,
    comment: '是否正在运行',
  })
  isRunning: boolean;

  @Column({
    name: 'last_status',
    type: 'enum',
    enum: AutomationTaskLastStatus,
    default: AutomationTaskLastStatus.NEVER,
    comment: '最近执行状态',
  })
  lastStatus: AutomationTaskLastStatus;

  @Column({
    name: 'last_started_at',
    type: 'timestamp',
    nullable: true,
    comment: '最近开始时间',
  })
  lastStartedAt?: Date | null;

  @Column({
    name: 'last_finished_at',
    type: 'timestamp',
    nullable: true,
    comment: '最近结束时间',
  })
  lastFinishedAt?: Date | null;

  @Column({
    name: 'last_duration_ms',
    type: 'int',
    nullable: true,
    comment: '最近耗时毫秒',
  })
  lastDurationMs?: number | null;

  @Column({
    name: 'last_message',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '最近执行消息',
  })
  lastMessage?: string | null;

  @Column({
    name: 'last_error',
    type: 'text',
    nullable: true,
    comment: '最近错误',
  })
  lastError?: string | null;
}
