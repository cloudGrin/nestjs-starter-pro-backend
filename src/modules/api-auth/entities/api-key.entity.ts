import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { ApiAppEntity } from './api-app.entity';
import * as crypto from 'crypto';

@Entity('api_keys')
export class ApiKeyEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string; // 密钥名称（如：Production Key）

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  keyHash: string; // API Key的哈希值（用于查询）

  @Column({ type: 'varchar', length: 10 })
  prefix: string; // 密钥前缀（如：sk_live）

  @Column({ type: 'varchar', length: 8 })
  suffix: string; // 密钥后缀（最后4位，用于显示）

  @Column({ type: 'json', nullable: true })
  scopes?: string[]; // 可覆盖应用级别的权限范围

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'bigint', default: 0 })
  usageCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // appId字段：可以直接赋值和查询
  // @JoinColumn也使用同一列名，TypeORM会识别它们是同一列
  @Column({ name: 'appId' })
  appId: number;

  @ManyToOne(() => ApiAppEntity, (app) => app.apiKeys)
  @JoinColumn({ name: 'appId' })
  app: ApiAppEntity;

  // 临时存储原始密钥（不保存到数据库）
  rawKey?: string;

  @BeforeInsert()
  generateKey() {
    if (!this.rawKey) {
      // 生成32字节的随机密钥
      const randomBytes = crypto.randomBytes(32);
      const key = randomBytes.toString('base64').replace(/[+/=]/g, '');

      // 设置前缀
      this.prefix = this.prefix || 'sk_live';

      // 生成完整密钥
      this.rawKey = `${this.prefix}_${key}`;

      // 存储哈希值
      this.keyHash = crypto
        .createHash('sha256')
        .update(this.rawKey)
        .digest('hex');

      // 存储后缀（用于显示）
      this.suffix = key.slice(-4);
    }
  }

  // 验证API Key
  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}