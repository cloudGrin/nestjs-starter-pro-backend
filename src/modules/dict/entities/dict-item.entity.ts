import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { DictTypeEntity } from './dict-type.entity';

export enum DictItemStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

@Entity('dict_items')
@Unique(['dictTypeId', 'value'])
@Index(['dictTypeId', 'sort'])
export class DictItemEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'int',
    name: 'dict_type_id',
    comment: '字典类型ID',
  })
  dictTypeId: number;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '字典项标签',
  })
  label: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '字典项标签（英文）',
  })
  labelEn?: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '字典项值',
  })
  value: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '标签颜色',
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '图标',
  })
  icon?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '描述',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: DictItemStatus,
    default: DictItemStatus.ENABLED,
    comment: '状态',
  })
  status: DictItemStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否默认值',
  })
  isDefault: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序',
  })
  sort: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展数据',
  })
  extra?: Record<string, any>;

  @ManyToOne(() => DictTypeEntity, (dictType) => dictType.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dict_type_id' })
  dictType: DictTypeEntity;
}
