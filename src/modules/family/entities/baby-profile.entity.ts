import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';

@Entity('baby_profiles')
export class BabyProfileEntity extends SoftDeleteBaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '宝宝昵称' })
  nickname: string;

  @Column({ name: 'birth_date', type: 'date', comment: '出生日期' })
  birthDate: string;

  @Column({ name: 'birth_time', type: 'time', nullable: true, comment: '出生时间' })
  birthTime?: string | null;

  @Column({ name: 'avatar_file_id', type: 'int', nullable: true, comment: '头像文件ID' })
  avatarFileId?: number | null;

  @ManyToOne(() => FileEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatar_file_id' })
  avatarFile?: FileEntity | null;

  @Column({
    name: 'birth_height_cm',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
    comment: '出生身高cm',
  })
  birthHeightCm?: number | string | null;

  @Column({
    name: 'birth_weight_kg',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '出生体重kg',
  })
  birthWeightKg?: number | string | null;
}
