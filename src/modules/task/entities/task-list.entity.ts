import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { TaskEntity } from './task.entity';

export enum TaskListScope {
  PERSONAL = 'personal',
  FAMILY = 'family',
}

@Entity('task_lists')
@Index(['scope', 'sort'])
export class TaskListEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    comment: '清单名称',
  })
  name: string;

  @Column({
    type: 'enum',
    enum: TaskListScope,
    default: TaskListScope.PERSONAL,
    comment: '清单范围',
  })
  scope: TaskListScope;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: '清单颜色',
  })
  color?: string | null;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否归档',
  })
  isArchived: boolean;

  @Column({
    name: 'owner_id',
    type: 'int',
    nullable: true,
    comment: '清单创建者',
  })
  ownerId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner?: UserEntity | null;

  @OneToMany(() => TaskEntity, (task) => task.list)
  tasks?: TaskEntity[];
}
