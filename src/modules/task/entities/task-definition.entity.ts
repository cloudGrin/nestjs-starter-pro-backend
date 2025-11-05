import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';

export enum TaskType {
  CRON = 'cron',
  INTERVAL = 'interval',
  TIMEOUT = 'timeout',
}

export enum TaskStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

@Entity('task_definitions')
@Index(['code'], { unique: true })
@Index(['status'])
export class TaskDefinitionEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '任务编码',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 150,
    comment: '任务名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '任务描述',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.CRON,
    comment: '任务类型',
  })
  type: TaskType;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'Cron 表达式或间隔配置',
  })
  schedule: string | null;

  @Column({
    type: 'json',
    nullable: true,
    comment: '执行参数',
  })
  payload?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.ENABLED,
    comment: '任务状态',
  })
  status: TaskStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否允许手动触发',
  })
  allowManual: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '处理器名称',
  })
  handler?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '上次执行状态',
  })
  lastStatus?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '上次执行时间',
  })
  lastRunAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '下次执行时间',
  })
  nextRunAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: '重试策略配置',
  })
  retryPolicy?: {
    enabled: boolean; // 是否启用重试
    maxRetries: number; // 最大重试次数（默认3次）
    retryDelay: number; // 初始重试延迟（毫秒，默认60000=1分钟）
    backoffMultiplier?: number; // 退避倍数（默认2，即指数退避）
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: '告警配置',
  })
  alertConfig?: {
    enabled: boolean; // 是否启用告警
    channels: Array<'log' | 'notification' | 'feishu' | 'email' | 'sms'>; // 告警渠道
    onlyOnConsecutiveFailures?: number; // 仅在连续失败N次后告警
  };

  @Column({
    type: 'int',
    nullable: true,
    comment: '任务执行超时时间（毫秒）',
    default: 3600000, // 默认1小时
  })
  timeout?: number;
}
