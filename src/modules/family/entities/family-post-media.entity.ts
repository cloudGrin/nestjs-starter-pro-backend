import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FamilyMediaType } from './family-media.types';
import { FamilyPostEntity } from './family-post.entity';

@Entity('family_post_media')
@Index(['postId', 'fileId'], { unique: true })
export class FamilyPostMediaEntity extends BaseEntity {
  @Column({
    name: 'post_id',
    type: 'int',
    comment: '动态ID',
  })
  postId: number;

  @ManyToOne(() => FamilyPostEntity, (post) => post.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: FamilyPostEntity;

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
    name: 'media_type',
    type: 'enum',
    enum: FamilyMediaType,
    comment: '媒体类型',
  })
  mediaType: FamilyMediaType;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;
}
