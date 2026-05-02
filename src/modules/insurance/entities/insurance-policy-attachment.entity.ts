import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { FileEntity } from '~/modules/file/entities/file.entity';
import { InsurancePolicyEntity } from './insurance-policy.entity';

@Entity('insurance_policy_attachments')
@Index(['policyId', 'fileId'], { unique: true })
export class InsurancePolicyAttachmentEntity extends BaseEntity {
  @Column({
    name: 'policy_id',
    type: 'int',
    comment: '保单ID',
  })
  policyId: number;

  @ManyToOne(() => InsurancePolicyEntity, (policy) => policy.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policy_id' })
  policy?: InsurancePolicyEntity;

  @Column({
    name: 'file_id',
    type: 'int',
    comment: '文件ID',
  })
  fileId: number;

  @ManyToOne(() => FileEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file?: FileEntity;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;
}
