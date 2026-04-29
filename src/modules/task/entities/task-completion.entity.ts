import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { TaskEntity } from './task.entity';

@Entity('task_completions')
@Index(['taskId', 'completedAt'])
export class TaskCompletionEntity extends BaseEntity {
  @Column({
    name: 'task_id',
    type: 'int',
    comment: '任务ID',
  })
  taskId: number;

  @ManyToOne(() => TaskEntity, (task) => task.completions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({
    name: 'completed_by_id',
    type: 'int',
    nullable: true,
    comment: '完成人',
  })
  completedById?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completed_by_id' })
  completedBy?: UserEntity | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    comment: '完成时间',
  })
  completedAt: Date;

  @Column({
    name: 'occurrence_due_at',
    type: 'timestamp',
    nullable: true,
    comment: '本次应完成时间',
  })
  occurrenceDueAt?: Date | null;

  @Column({
    name: 'next_due_at',
    type: 'timestamp',
    nullable: true,
    comment: '下一次应完成时间',
  })
  nextDueAt?: Date | null;
}
