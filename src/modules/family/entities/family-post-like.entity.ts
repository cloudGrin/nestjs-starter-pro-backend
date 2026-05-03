import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { FamilyPostEntity } from './family-post.entity';

@Entity('family_post_likes')
@Index(['postId', 'userId'], { unique: true })
export class FamilyPostLikeEntity extends BaseEntity {
  @Column({
    name: 'post_id',
    type: 'int',
    comment: '动态ID',
  })
  postId: number;

  @ManyToOne(() => FamilyPostEntity, (post) => post.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: FamilyPostEntity;

  @Column({
    name: 'user_id',
    type: 'int',
    comment: '点赞用户ID',
  })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
