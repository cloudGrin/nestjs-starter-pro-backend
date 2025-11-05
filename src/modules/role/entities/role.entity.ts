import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { PermissionEntity } from '~/modules/permission/entities/permission.entity';
import { MenuEntity } from '~/modules/menu/entities/menu.entity';

export enum RoleCategory {
  SYSTEM = 'system', // 系统角色
  BUSINESS = 'business', // 业务角色
  TEMP = 'temp', // 临时角色
  CUSTOM = 'custom', // 自定义角色
}

@Entity('roles')
export class RoleEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '角色编码',
  })
  code: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '角色名称',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '角色描述',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: RoleCategory,
    default: RoleCategory.BUSINESS,
    comment: '角色分类',
  })
  category: RoleCategory;

  @Column({
    type: 'int',
    default: 0,
    comment: '排序',
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
    comment: '是否为系统角色（不可删除）',
  })
  isSystem: boolean;

  // 用户关联
  @ManyToMany(() => UserEntity, (user) => user.roles)
  users: UserEntity[];

  // 权限关联（直接分配权限）
  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: PermissionEntity[];

  // 菜单关联（role_menus 中间表）
  @ManyToMany(() => MenuEntity, (menu) => menu.roles)
  @JoinTable({
    name: 'role_menus',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'menu_id', referencedColumnName: 'id' },
  })
  menus?: MenuEntity[];
}
