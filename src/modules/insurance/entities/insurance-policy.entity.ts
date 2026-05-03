import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { InsuranceMemberEntity } from './insurance-member.entity';
import { InsurancePolicyAttachmentEntity } from './insurance-policy-attachment.entity';
import { InsurancePolicyReminderEntity } from './insurance-policy-reminder.entity';

export enum InsurancePolicyType {
  MEDICAL = 'medical',
  CRITICAL_ILLNESS = 'critical_illness',
  LIFE = 'life',
  ACCIDENT = 'accident',
  AUTO = 'auto',
  HOME_PROPERTY = 'home_property',
  TRAVEL = 'travel',
  OTHER = 'other',
}

@Entity('insurance_policies')
@Index(['memberId', 'type'])
@Index(['endDate'])
@Index(['nextPaymentDate'])
@Index(['ownerUserId'])
export class InsurancePolicyEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 150,
    comment: '保单名称',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '保险公司',
  })
  company?: string | null;

  @Column({
    name: 'policy_no',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '保单号',
  })
  policyNo?: string | null;

  @Column({
    name: 'member_id',
    type: 'int',
    comment: '归属成员',
  })
  memberId: number;

  @ManyToOne(() => InsuranceMemberEntity, (member) => member.policies, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member?: InsuranceMemberEntity;

  @Column({
    type: 'enum',
    enum: InsurancePolicyType,
    comment: '险种',
  })
  type: InsurancePolicyType;

  @Column({
    name: 'effective_date',
    type: 'date',
    nullable: true,
    comment: '生效日期',
  })
  effectiveDate?: string | null;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: true,
    comment: '到期日期',
  })
  endDate?: string | null;

  @Column({
    name: 'next_payment_date',
    type: 'date',
    nullable: true,
    comment: '下次缴费日期',
  })
  nextPaymentDate?: string | null;

  @Column({
    name: 'payment_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '缴费金额',
  })
  paymentAmount?: string | number | null;

  @Column({
    name: 'owner_user_id',
    type: 'int',
    comment: '保单负责人',
  })
  ownerUserId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_user_id' })
  ownerUser?: UserEntity;

  @Column({
    type: 'text',
    nullable: true,
    comment: '备注',
  })
  remark?: string | null;

  @OneToMany(() => InsurancePolicyAttachmentEntity, (attachment) => attachment.policy)
  attachments?: InsurancePolicyAttachmentEntity[];

  @OneToMany(() => InsurancePolicyReminderEntity, (reminder) => reminder.policy)
  reminders?: InsurancePolicyReminderEntity[];
}
