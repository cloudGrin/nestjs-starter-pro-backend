import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';

@Entity('api_access_logs')
@Index('IDX_api_access_logs_app_created_at', ['appId', 'createdAt'])
@Index('IDX_api_access_logs_app_key_created_at', ['appId', 'keyId', 'createdAt'])
@Index('IDX_api_access_logs_app_status_created_at', ['appId', 'statusCode', 'createdAt'])
export class ApiAccessLogEntity extends BaseEntity {
  @Column({ type: 'int' })
  appId: number;

  @Column({ type: 'int', nullable: true })
  keyId?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  keyName?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  keyPrefix?: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  keySuffix?: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent?: string;
}
