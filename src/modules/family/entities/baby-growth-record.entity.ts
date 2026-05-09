import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';

@Entity('baby_growth_records')
@Index(['measuredAt'])
export class BabyGrowthRecordEntity extends SoftDeleteBaseEntity {
  @Column({ name: 'measured_at', type: 'date', comment: '测量日期' })
  measuredAt: string;

  @Column({
    name: 'height_cm',
    type: 'decimal',
    precision: 5,
    scale: 1,
    nullable: true,
    comment: '身高cm',
  })
  heightCm?: number | string | null;

  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '体重kg',
  })
  weightKg?: number | string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '备注' })
  remark?: string | null;
}
