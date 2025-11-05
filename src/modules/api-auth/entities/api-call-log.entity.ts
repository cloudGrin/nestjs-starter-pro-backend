import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';

@Entity('api_call_logs')
@Index(['appId', 'createdAt']) // 用于按应用查询
@Index(['endpoint', 'createdAt']) // 用于按端点分析
export class ApiCallLogEntity extends BaseEntity {
  @Column({ type: 'int' })
  appId: number;

  @Column({ type: 'varchar', length: 100 })
  appName: string;

  @Column({ type: 'int', nullable: true })
  keyId?: number;

  @Column({ type: 'varchar', length: 10 })
  method: string; // GET, POST, etc.

  @Column({ type: 'varchar', length: 255 })
  endpoint: string; // /api/v1/users

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int' })
  responseTime: number; // 毫秒

  @Column({ type: 'bigint', nullable: true })
  requestSize?: number; // 请求大小（字节）

  @Column({ type: 'bigint', nullable: true })
  responseSize?: number; // 响应大小（字节）

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>; // 额外的元数据
}