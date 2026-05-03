import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { TaskListEntity } from './task-list.entity';
import { TaskCompletionEntity } from './task-completion.entity';
import { TaskAttachmentEntity } from './task-attachment.entity';
import { TaskCheckItemEntity } from './task-check-item.entity';

export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum TaskType {
  TASK = 'task',
  ANNIVERSARY = 'anniversary',
}

export enum TaskRecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  WEEKDAYS = 'weekdays',
  CUSTOM = 'custom',
}

@Entity('tasks')
@Index(['listId', 'status'])
@Index(['assigneeId', 'status'])
@Index(['dueAt'])
@Index(['nextReminderAt'])
@Index(['taskType'])
export class TaskEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 200,
    comment: '任务标题',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '任务描述',
  })
  description?: string | null;

  @Column({
    name: 'list_id',
    type: 'int',
    comment: '所属清单',
  })
  listId: number;

  @ManyToOne(() => TaskListEntity, (list) => list.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id' })
  list?: TaskListEntity;

  @Column({
    name: 'creator_id',
    type: 'int',
    nullable: true,
    comment: '创建者',
  })
  creatorId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creator_id' })
  creator?: UserEntity | null;

  @Column({
    name: 'assignee_id',
    type: 'int',
    nullable: true,
    comment: '负责人',
  })
  assigneeId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: UserEntity | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
    comment: '任务状态',
  })
  status: TaskStatus;

  @Column({
    name: 'task_type',
    type: 'enum',
    enum: TaskType,
    default: TaskType.TASK,
    comment: '任务类型',
  })
  taskType: TaskType;

  @Column({
    name: 'due_at',
    type: 'timestamp',
    nullable: true,
    comment: '到期时间',
  })
  dueAt?: Date | null;

  @Column({
    name: 'remind_at',
    type: 'timestamp',
    nullable: true,
    comment: '提醒时间',
  })
  remindAt?: Date | null;

  @Column({
    name: 'reminded_at',
    type: 'timestamp',
    nullable: true,
    comment: '已提醒时间',
  })
  remindedAt?: Date | null;

  @Column({
    name: 'next_reminder_at',
    type: 'timestamp',
    nullable: true,
    comment: '下一次提醒时间',
  })
  nextReminderAt?: Date | null;

  @Column({
    name: 'continuous_reminder_enabled',
    type: 'boolean',
    default: true,
    comment: '是否持续提醒',
  })
  continuousReminderEnabled: boolean;

  @Column({
    name: 'continuous_reminder_interval_minutes',
    type: 'int',
    default: 30,
    comment: '持续提醒间隔分钟',
  })
  continuousReminderIntervalMinutes: number;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
    comment: '完成时间',
  })
  completedAt?: Date | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否重要',
  })
  important: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否紧急',
  })
  urgent: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '任务标签',
  })
  tags?: string[] | null;

  @Column({
    name: 'recurrence_type',
    type: 'enum',
    enum: TaskRecurrenceType,
    default: TaskRecurrenceType.NONE,
    comment: '重复类型',
  })
  recurrenceType: TaskRecurrenceType;

  @Column({
    name: 'recurrence_interval',
    type: 'int',
    nullable: true,
    comment: '重复间隔',
  })
  recurrenceInterval?: number | null;

  @OneToMany(() => TaskCompletionEntity, (completion) => completion.task)
  completions?: TaskCompletionEntity[];

  @OneToMany(() => TaskAttachmentEntity, (attachment) => attachment.task)
  attachments?: TaskAttachmentEntity[];

  @OneToMany(() => TaskCheckItemEntity, (item) => item.task)
  checkItems?: TaskCheckItemEntity[];
}
