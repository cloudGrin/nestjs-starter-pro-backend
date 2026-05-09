import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { BabyBirthdayContributionEntity } from './baby-birthday-contribution.entity';
import { BabyBirthdayEntity } from './baby-birthday.entity';

@Entity('baby_birthday_media')
@Index(['birthdayId', 'sort'])
export class BabyBirthdayMediaEntity extends SoftDeleteBaseEntity {
  @Column({ name: 'birthday_id', type: 'int', comment: '生日合辑ID' })
  birthdayId: number;

  @ManyToOne(() => BabyBirthdayEntity, (birthday) => birthday.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'birthday_id' })
  birthday?: BabyBirthdayEntity;

  @Column({ name: 'contribution_id', type: 'int', nullable: true, comment: '祝福ID' })
  contributionId?: number | null;

  @ManyToOne(() => BabyBirthdayContributionEntity, (contribution) => contribution.media, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contribution_id' })
  contribution?: BabyBirthdayContributionEntity | null;

  @Column({ name: 'file_id', type: 'int', comment: '文件ID' })
  fileId: number;

  @ManyToOne(() => FileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file?: FileEntity;

  @Column({ name: 'uploader_id', type: 'int', comment: '上传者ID' })
  uploaderId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploader_id' })
  uploader?: UserEntity;

  @Column({ type: 'int', default: 0, comment: '排序值' })
  sort: number;
}
