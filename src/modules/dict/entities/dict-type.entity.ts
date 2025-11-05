import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { DictItemEntity } from './dict-item.entity';

export enum DictSource {
  PLATFORM = 'platform', // 平台内置
  CUSTOM = 'custom', // 自定义
}

@Entity('dict_types')
export class DictTypeEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '字典类型编码',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '字典类型名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '描述',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: DictSource,
    default: DictSource.CUSTOM,
    comment: '字典来源',
  })
  source: DictSource;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否系统内置（不可删除）',
  })
  isSystem: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序',
  })
  sort: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展配置',
  })
  config?: Record<string, any>;

  @OneToMany(() => DictItemEntity, (item) => item.dictType, {
    cascade: true,
  })
  items: DictItemEntity[];
}
