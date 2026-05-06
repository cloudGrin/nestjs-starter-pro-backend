import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Entity('family_read_states')
@Index('UQ_family_read_states_user', ['userId'], { unique: true })
export class FamilyReadStateEntity extends SoftDeleteBaseEntity {
  @Column({
    name: 'user_id',
    type: 'int',
    comment: '用户ID',
  })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({
    name: 'last_read_post_id',
    type: 'int',
    nullable: true,
    comment: '最后已读家庭圈动态ID',
  })
  lastReadPostId?: number | null;

  @Column({
    name: 'last_read_chat_message_id',
    type: 'int',
    nullable: true,
    comment: '最后已读家庭群聊消息ID',
  })
  lastReadChatMessageId?: number | null;

  @Column({
    name: 'read_posts_at',
    type: 'timestamp',
    nullable: true,
    comment: '家庭圈阅读时间',
  })
  readPostsAt?: Date | null;

  @Column({
    name: 'read_chat_at',
    type: 'timestamp',
    nullable: true,
    comment: '家庭群聊阅读时间',
  })
  readChatAt?: Date | null;
}
