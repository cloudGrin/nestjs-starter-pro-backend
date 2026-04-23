import { Column, Entity, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';

export enum FileStorageType {
  LOCAL = 'local',
  OSS = 'oss',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  AVAILABLE = 'available',
  PROCESSING = 'processing',
  FAILED = 'failed',
}

@Entity('files')
@Index(['hash'])
@Index(['storage'])
@Index(['category'])
export class FileEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: '原始文件名',
  })
  originalName: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
    comment: '存储后的文件名',
  })
  filename: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: '文件存储路径（相对路径）',
  })
  path: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '文件访问URL',
  })
  url?: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'MIME 类型',
  })
  mimeType: string;

  @Column({
    type: 'bigint',
    comment: '文件大小（字节）',
  })
  size: number;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '文件类别',
  })
  category: string;

  @Column({
    type: 'enum',
    enum: FileStorageType,
    default: FileStorageType.LOCAL,
    comment: '存储类型',
  })
  storage: FileStorageType;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '文件哈希值',
  })
  hash?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '文件元数据',
  })
  metadata?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.AVAILABLE,
    comment: '文件状态',
  })
  status: FileStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '业务模块标识',
  })
  module?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '业务标签（用逗号分隔）',
  })
  tags?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否公开访问',
  })
  isPublic: boolean;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '备注信息',
  })
  remark?: string;

  @Index()
  @Column({
    type: 'int',
    nullable: true,
    comment: '上传者ID',
  })
  uploaderId?: number;
}
