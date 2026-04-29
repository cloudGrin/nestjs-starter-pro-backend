import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Entity('refresh_tokens')
@Index('UQ_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_refresh_tokens_tokenHash_userId', ['tokenHash', 'userId'])
export class RefreshTokenEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    name: 'token_hash',
    length: 64,
    comment: '刷新Token SHA-256哈希',
  })
  tokenHash: string;

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
