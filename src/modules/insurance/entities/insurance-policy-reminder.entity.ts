import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { NotificationEntity } from '~/modules/notification/entities/notification.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { InsurancePolicyEntity } from './insurance-policy.entity';

export enum InsurancePolicyReminderType {
  EXPIRY_30D = 'expiry_30d',
  EXPIRY_7D = 'expiry_7d',
  PAYMENT_7D = 'payment_7d',
  PAYMENT_DUE = 'payment_due',
}

@Entity('insurance_policy_reminders')
@Index(['remindDate', 'sentAt'])
@Index(['policyId', 'reminderType', 'remindDate'], { unique: true })
export class InsurancePolicyReminderEntity extends BaseEntity {
  @Column({
    name: 'policy_id',
    type: 'int',
    comment: '保单ID',
  })
  policyId: number;

  @ManyToOne(() => InsurancePolicyEntity, (policy) => policy.reminders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy?: InsurancePolicyEntity;

  @Column({
    name: 'reminder_type',
    type: 'enum',
    enum: InsurancePolicyReminderType,
    comment: '提醒类型',
  })
  reminderType: InsurancePolicyReminderType;

  @Column({
    name: 'remind_date',
    type: 'date',
    comment: '提醒日期',
  })
  remindDate: string;

  @Column({
    name: 'recipient_user_id',
    type: 'int',
    comment: '接收用户',
  })
  recipientUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser?: UserEntity;

  @Column({
    name: 'sent_at',
    type: 'timestamp',
    nullable: true,
    comment: '发送时间',
  })
  sentAt?: Date | null;

  @Column({
    name: 'notification_id',
    type: 'int',
    nullable: true,
    comment: '通知ID',
  })
  notificationId?: number | null;

  @ManyToOne(() => NotificationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'notification_id' })
  notification?: NotificationEntity | null;

  @Column({
    name: 'last_error',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '最近错误',
  })
  lastError?: string | null;
}
