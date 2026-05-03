import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { FamilyPostCommentEntity } from './family-post-comment.entity';
import { FamilyPostLikeEntity } from './family-post-like.entity';
import { FamilyPostMediaEntity } from './family-post-media.entity';

@Entity('family_posts')
@Index(['authorId', 'createdAt'])
export class FamilyPostEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'text',
    nullable: true,
    comment: '动态文字内容',
  })
  content?: string | null;

  @Column({
    name: 'author_id',
    type: 'int',
    comment: '发布者ID',
  })
  authorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: UserEntity;

  @OneToMany(() => FamilyPostMediaEntity, (media) => media.post)
  media?: FamilyPostMediaEntity[];

  @OneToMany(() => FamilyPostCommentEntity, (comment) => comment.post)
  comments?: FamilyPostCommentEntity[];

  @OneToMany(() => FamilyPostLikeEntity, (like) => like.post)
  likes?: FamilyPostLikeEntity[];
}
