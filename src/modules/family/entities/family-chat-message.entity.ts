import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { FamilyChatMessageMediaEntity } from './family-chat-message-media.entity';

@Entity('family_chat_messages')
@Index(['senderId', 'createdAt'])
export class FamilyChatMessageEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'text',
    nullable: true,
    comment: '消息文字内容',
  })
  content?: string | null;

  @Column({
    name: 'sender_id',
    type: 'int',
    comment: '发送者ID',
  })
  senderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender?: UserEntity;

  @OneToMany(() => FamilyChatMessageMediaEntity, (media) => media.message)
  media?: FamilyChatMessageMediaEntity[];
}
