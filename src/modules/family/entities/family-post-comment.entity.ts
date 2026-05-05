import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { FamilyPostEntity } from './family-post.entity';

@Entity('family_post_comments')
@Index(['postId', 'createdAt'])
@Index(['parentCommentId'])
@Index(['replyToUserId'])
export class FamilyPostCommentEntity extends SoftDeleteBaseEntity {
  @Column({
    name: 'post_id',
    type: 'int',
    comment: '动态ID',
  })
  postId: number;

  @ManyToOne(() => FamilyPostEntity, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: FamilyPostEntity;

  @Column({
    name: 'author_id',
    type: 'int',
    comment: '评论者ID',
  })
  authorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: UserEntity;

  @Column({
    name: 'parent_comment_id',
    type: 'int',
    nullable: true,
    comment: '父评论ID',
  })
  parentCommentId?: number | null;

  @ManyToOne(() => FamilyPostCommentEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: FamilyPostCommentEntity | null;

  @Column({
    name: 'reply_to_user_id',
    type: 'int',
    nullable: true,
    comment: '回复目标用户ID',
  })
  replyToUserId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reply_to_user_id' })
  replyToUser?: UserEntity | null;

  @Column({
    type: 'text',
    comment: '评论内容',
  })
  content: string;
}
