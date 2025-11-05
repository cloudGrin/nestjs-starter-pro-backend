import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { UserStatus, UserGender } from '~/common/enums/user.enum';
import { CryptoUtil } from '~/common/utils/crypto.util';

@Entity('users')
@Index('IDX_users_phone', ['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class UserEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '用户名',
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '邮箱',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 200,
    select: false,
    comment: '密码',
  })
  @Exclude()
  password: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '姓名',
  })
  realName?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '昵称',
  })
  nickname?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '头像',
  })
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '手机号',
  })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserGender,
    default: UserGender.UNKNOWN,
    comment: '性别',
  })
  gender: UserGender;

  @Column({
    type: 'date',
    nullable: true,
    comment: '出生日期',
  })
  birthday?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '地址',
  })
  address?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '个人简介',
  })
  bio?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    comment: '状态',
  })
  status: UserStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '最后登录时间',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '最后登录IP',
  })
  lastLoginIp?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: '登录失败次数',
  })
  loginAttempts: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '锁定截止时间',
  })
  lockedUntil?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否验证邮箱',
  })
  isEmailVerified: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否验证手机',
  })
  isPhoneVerified: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否启用双因素认证',
  })
  isTwoFactorEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    select: false,
    comment: '双因素认证密钥',
  })
  @Exclude()
  twoFactorSecret?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    select: false,
    comment: '刷新Token',
  })
  @Exclude()
  refreshToken?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '用户设置',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展信息',
  })
  extra?: Record<string, any>;

  @ManyToMany(() => RoleEntity, (role) => role.users, { cascade: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: RoleEntity[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await CryptoUtil.hashPassword(this.password);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return CryptoUtil.comparePassword(password, this.password);
  }

  isLocked(): boolean {
    return (
      this.status === UserStatus.LOCKED || !!(this.lockedUntil && this.lockedUntil > new Date())
    );
  }

  incrementLoginAttempts(): void {
    this.loginAttempts += 1;

    // ✅ 区分超级管理员和普通用户的锁定策略
    // 超级管理员：10次失败后锁定10分钟（更宽松）
    // 普通用户：5次失败后锁定30分钟
    const isSuperAdmin = this.roles?.some((role) => role.code === 'super_admin');
    const maxAttempts = isSuperAdmin ? 10 : 5;
    const lockMinutes = isSuperAdmin ? 10 : 30;

    if (this.loginAttempts >= maxAttempts) {
      const lockTime = new Date();
      lockTime.setMinutes(lockTime.getMinutes() + lockMinutes);
      this.lockedUntil = lockTime;
    }
  }

  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockedUntil = undefined;
  }
}
