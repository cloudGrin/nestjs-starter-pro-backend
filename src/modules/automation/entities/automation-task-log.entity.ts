import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';

export enum AutomationTaskTriggerType {
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  SYSTEM = 'system',
}

export enum AutomationTaskLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('automation_task_logs')
@Index(['taskKey', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['triggerType', 'createdAt'])
export class AutomationTaskLogEntity extends BaseEntity {
  @Column({
    name: 'task_key',
    type: 'varchar',
    length: 100,
    comment: '任务唯一编码',
  })
  taskKey: string;

  @Column({
    name: 'trigger_type',
    type: 'enum',
    enum: AutomationTaskTriggerType,
    comment: '触发方式',
  })
  triggerType: AutomationTaskTriggerType;

  @Column({
    type: 'enum',
    enum: AutomationTaskLogStatus,
    comment: '执行状态',
  })
  status: AutomationTaskLogStatus;

  @Column({
    name: 'started_at',
    type: 'timestamp',
    comment: '开始时间',
  })
  startedAt: Date;

  @Column({
    name: 'finished_at',
    type: 'timestamp',
    comment: '结束时间',
  })
  finishedAt: Date;

  @Column({
    name: 'duration_ms',
    type: 'int',
    default: 0,
    comment: '耗时毫秒',
  })
  durationMs: number;

  @Column({
    name: 'params_snapshot',
    type: 'json',
    nullable: true,
    comment: '参数快照',
  })
  paramsSnapshot?: Record<string, unknown> | null;

  @Column({
    name: 'result_message',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '结果消息',
  })
  resultMessage?: string | null;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: '错误消息',
  })
  errorMessage?: string | null;
}
