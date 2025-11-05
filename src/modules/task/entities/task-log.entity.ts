import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { TaskDefinitionEntity } from './task-definition.entity';

export enum TaskLogStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  RUNNING = 'running',
}

@Entity('task_logs')
@Index(['taskId', 'createdAt'])
@Index(['status'])
export class TaskLogEntity extends BaseEntity {
  @Column({
    name: 'task_id',
    type: 'int',
    comment: '任务 ID',
  })
  taskId: number;

  @ManyToOne(() => TaskDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskDefinitionEntity;

  @Column({
    type: 'enum',
    enum: TaskLogStatus,
    default: TaskLogStatus.RUNNING,
    comment: '执行状态',
  })
  status: TaskLogStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: '执行结果或错误信息',
  })
  message?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '上下文数据',
  })
  context?: Record<string, unknown>;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '开始时间',
  })
  startedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '结束时间',
  })
  finishedAt?: Date;
}
