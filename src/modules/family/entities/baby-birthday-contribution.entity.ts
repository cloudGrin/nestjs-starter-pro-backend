import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { BabyBirthdayEntity } from './baby-birthday.entity';
import { BabyBirthdayMediaEntity } from './baby-birthday-media.entity';

@Entity('baby_birthday_contributions')
@Index(['birthdayId', 'createdAt'])
export class BabyBirthdayContributionEntity extends SoftDeleteBaseEntity {
  @Column({ name: 'birthday_id', type: 'int', comment: '生日合辑ID' })
  birthdayId: number;

  @ManyToOne(() => BabyBirthdayEntity, (birthday) => birthday.contributions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'birthday_id' })
  birthday?: BabyBirthdayEntity;

  @Column({ name: 'author_id', type: 'int', comment: '祝福人ID' })
  authorId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: UserEntity;

  @Column({ type: 'text', nullable: true, comment: '祝福内容' })
  content?: string | null;

  @OneToMany(() => BabyBirthdayMediaEntity, (media) => media.contribution)
  media?: BabyBirthdayMediaEntity[];
}
