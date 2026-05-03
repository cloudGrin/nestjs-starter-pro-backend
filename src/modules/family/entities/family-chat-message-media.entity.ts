import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { FamilyMediaType } from './family-media.types';
import { FamilyChatMessageEntity } from './family-chat-message.entity';

@Entity('family_chat_message_media')
@Index(['messageId', 'fileId'], { unique: true })
export class FamilyChatMessageMediaEntity extends BaseEntity {
  @Column({
    name: 'message_id',
    type: 'int',
    comment: '聊天消息ID',
  })
  messageId: number;

  @ManyToOne(() => FamilyChatMessageEntity, (message) => message.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message?: FamilyChatMessageEntity;

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
