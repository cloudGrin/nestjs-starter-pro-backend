import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Entity('user_notification_settings')
@Index(['userId'], { unique: true })
export class UserNotificationSettingEntity extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'int',
    comment: '用户ID',
  })
  userId: number;

  @OneToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({
    name: 'bark_key',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Bark 设备 Key',
  })
  barkKey?: string | null;

  @Column({
    name: 'feishu_user_id',
    type: 'varchar',
    length: 128,
    nullable: true,
    comment: '飞书用户 user_id',
  })
  feishuUserId?: string | null;
}
