import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { BabyBirthdayContributionEntity } from './baby-birthday-contribution.entity';
import { BabyBirthdayMediaEntity } from './baby-birthday-media.entity';

@Entity('baby_birthdays')
export class BabyBirthdayEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'int', comment: '生日年份' })
  year: number;

  @Column({ type: 'varchar', length: 100, comment: '生日标题' })
  title: string;

  @Column({ type: 'text', nullable: true, comment: '生日描述' })
  description?: string | null;

  @Column({ name: 'cover_file_id', type: 'int', nullable: true, comment: '封面文件ID' })
  coverFileId?: number | null;

  @ManyToOne(() => FileEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cover_file_id' })
  coverFile?: FileEntity | null;

  @OneToMany(() => BabyBirthdayMediaEntity, (media) => media.birthday)
  media?: BabyBirthdayMediaEntity[];

  @OneToMany(() => BabyBirthdayContributionEntity, (contribution) => contribution.birthday)
  contributions?: BabyBirthdayContributionEntity[];
}
