import { Entity, Column, ManyToMany, Index } from 'typeorm';
import { BaseEntity } from '~/core/base/base.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';

export enum PermissionType {
  API = 'api', // API接口权限
  FEATURE = 'feature', // 功能权限
}

/**
 * 权限实体 - 简化版（轻量级实现）
 * 职责：定义系统中的权限点，控制用户能调用哪些API、能访问哪些功能
 *
 * 权限命名规范：{module}:{resource}:{action}
 * 示例：
 * - finance:record:read    财务模块-账单-查看
 * - finance:record:create  财务模块-账单-创建
 * - inventory:item:delete  库存模块-物品-删除
 */
@Entity('permissions')
@Index(['module', 'code'])
export class PermissionEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '权限编码（唯一标识）',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '权限名称',
  })
  name: string;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.API,
    comment: '权限类型',
  })
  type: PermissionType;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '所属模块',
  })
  module: string;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否为系统内置（不可删除）',
  })
  isSystem: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: '权限描述',
  })
  description?: string;

  // 拥有此权限的角色
  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles: RoleEntity[];
}
