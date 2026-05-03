import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { TaskEntity } from './task.entity';

@Entity('task_check_items')
@Index(['taskId', 'sort'])
export class TaskCheckItemEntity extends BaseEntity {
  @Column({
    name: 'task_id',
    type: 'int',
    comment: '任务ID',
  })
  taskId: number;

  @ManyToOne(() => TaskEntity, (task) => task.checkItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({
    type: 'varchar',
    length: 200,
    comment: '检查项标题',
  })
  title: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否完成',
  })
  completed: boolean;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
    comment: '完成时间',
  })
  completedAt?: Date | null;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;
}
