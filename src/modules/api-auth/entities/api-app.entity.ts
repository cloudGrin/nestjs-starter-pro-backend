import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { ApiKeyEntity } from './api-key.entity';

@Entity('api_apps')
export class ApiAppEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  callbackUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookUrl?: string;

  @Column({ type: 'json', nullable: true })
  scopes?: string[]; // ['read:users', 'write:orders']

  @Column({ type: 'json', nullable: true })
  ipWhitelist?: string[]; // IP白名单

  @Column({ type: 'int', default: 1000 })
  rateLimitPerHour: number;

  @Column({ type: 'int', default: 10000 })
  rateLimitPerDay: number;

  @Column({ type: 'bigint', default: 0 })
  totalCalls: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCalledAt?: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  ownerId?: number; // 所属用户/组织

  @OneToMany(() => ApiKeyEntity, (key) => key.app)
  apiKeys: ApiKeyEntity[];
}
