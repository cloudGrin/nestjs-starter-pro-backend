import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';

export enum NotificationType {
  SYSTEM = 'system',
  MESSAGE = 'message',
  REMINDER = 'reminder',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export enum NotificationChannel {
  INTERNAL = 'internal',
  BARK = 'bark',
  FEISHU = 'feishu',
  SMS = 'sms',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  response?: Record<string, unknown>;
  sentAt: string;
}

@Entity('notifications')
@Index(['recipientId', 'status'])
@Index(['type'])
@Index(['isSystem'])
export class NotificationEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 150,
    comment: '通知标题',
  })
  title: string;

  @Column({
    type: 'text',
    comment: '通知内容',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
    comment: '通知类型',
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
    comment: '通知状态',
  })
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
    comment: '通知优先级',
  })
  priority: NotificationPriority;

  @Column({
    type: 'json',
    nullable: true,
    comment: '发送渠道列表',
  })
  channels?: NotificationChannel[] | null;

  @Column({
    name: 'recipient_id',
    type: 'int',
    nullable: true,
    comment: '接收者ID（空表示广播）',
  })
  recipientId?: number;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient?: UserEntity | null;

  @Column({
    name: 'sender_id',
    type: 'int',
    nullable: true,
    comment: '发送者ID',
  })
  senderId?: number;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_id' })
  sender?: UserEntity | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否系统通知',
  })
  isSystem: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '读取时间',
  })
  readAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '过期时间',
  })
  expireAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展数据（跳转链接、参数等）',
  })
  metadata?: Record<string, unknown>;

  @Column({
    type: 'boolean',
    default: false,
    comment: '离线时是否触发外部渠道',
  })
  sendExternalWhenOffline: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '外部渠道发送结果',
  })
  deliveryResults?: NotificationDeliveryResult[] | null;
}
