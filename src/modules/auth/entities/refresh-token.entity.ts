import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Entity('refresh_tokens')
@Index(['token', 'userId'])
export class RefreshTokenEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 500,
    unique: true,
    comment: '刷新Token',
  })
  token: string;

  @Column({
    type: 'int',
    name: 'userId',
    comment: '用户ID',
  })
  userId: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '设备ID',
  })
  deviceId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'User Agent',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'IP地址',
  })
  ipAddress?: string;

  @Column({
    type: 'timestamp',
    comment: '过期时间',
  })
  expiresAt: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否已撤销',
  })
  isRevoked: boolean;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: UserEntity;

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
