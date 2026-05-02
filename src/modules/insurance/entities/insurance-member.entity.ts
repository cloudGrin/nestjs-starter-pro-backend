import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { InsurancePolicyEntity } from './insurance-policy.entity';

@Entity('insurance_members')
@Index(['sort', 'id'])
export class InsuranceMemberEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    comment: '成员姓名',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '家庭关系',
  })
  relationship?: string | null;

  @Column({
    name: 'linked_user_id',
    type: 'int',
    nullable: true,
    comment: '绑定的系统用户',
  })
  linkedUserId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linked_user_id' })
  linkedUser?: UserEntity | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '备注',
  })
  remark?: string | null;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;

  @OneToMany(() => InsurancePolicyEntity, (policy) => policy.member)
  policies?: InsurancePolicyEntity[];
}
