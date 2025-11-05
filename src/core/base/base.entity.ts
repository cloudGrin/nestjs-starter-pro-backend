import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  DeleteDateColumn,
} from 'typeorm';

/**
 * 基础实体类
 * 所有实体都应继承此类
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({
    type: 'timestamp',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: '更新时间',
  })
  updatedAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '创建人',
  })
  createdBy?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '更新人',
  })
  updatedBy?: string;
}

/**
 * 支持软删除的基础实体类
 */
export abstract class SoftDeleteBaseEntity extends BaseEntity {
  @DeleteDateColumn({
    type: 'timestamp',
    comment: '删除时间',
  })
  deletedAt?: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '删除人',
  })
  deletedBy?: string;
}
