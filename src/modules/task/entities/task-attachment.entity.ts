import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { TaskEntity } from './task.entity';

@Entity('task_attachments')
@Index(['taskId', 'fileId'], { unique: true })
export class TaskAttachmentEntity extends BaseEntity {
  @Column({
    name: 'task_id',
    type: 'int',
    comment: '任务ID',
  })
  taskId: number;

  @ManyToOne(() => TaskEntity, (task) => task.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({
    name: 'file_id',
    type: 'int',
    comment: '文件ID',
  })
  fileId: number;

  @ManyToOne(() => FileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file?: FileEntity;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;
}
