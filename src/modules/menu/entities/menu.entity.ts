import { Entity, Column, ManyToOne, ManyToMany, OneToMany, JoinColumn, Index } from 'typeorm';
import { SoftDeleteBaseEntity } from '~/core/base/base.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';

export enum MenuType {
  DIRECTORY = 'directory', // 目录
  MENU = 'menu', // 菜单页面
}

/**
 * 菜单实体 - 纯前端菜单树
 * 职责：前端路由、导航菜单、页面布局
 * 与权限解耦：菜单只负责展示，权限负责控制
 */
@Entity('menus')
@Index(['parentId', 'sort'])
export class MenuEntity extends SoftDeleteBaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    comment: '菜单名称',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '菜单路径',
  })
  path?: string;

  @Column({
    type: 'enum',
    enum: MenuType,
    default: MenuType.MENU,
    comment: '菜单类型',
  })
  type: MenuType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '菜单图标',
  })
  icon?: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '组件路径',
  })
  component?: string;

  @Column({
    name: 'parent_id',
    type: 'int',
    nullable: true,
    comment: '父菜单ID',
  })
  parentId: number | null;

  @ManyToOne(() => MenuEntity, (menu) => menu.children, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: MenuEntity | null;

  @OneToMany(() => MenuEntity, (menu) => menu.parent)
  children?: MenuEntity[];

  @Column({
    type: 'int',
    default: 0,
    comment: '排序值',
  })
  sort: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否显示',
  })
  isVisible: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否启用',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否外链',
  })
  isExternal: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否缓存页面',
  })
  isCache: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: '路由元数据',
  })
  meta?: {
    title: string; // 页面标题
    icon?: string; // 图标
    hidden?: boolean; // 是否隐藏
    alwaysShow?: boolean; // 是否总是显示根菜单
    noCache?: boolean; // 不缓存
    breadcrumb?: boolean; // 是否显示面包屑
    affix?: boolean; // 是否固定在标签栏
    activeMenu?: string; // 高亮菜单
    badge?: string | number; // 徽标
    [key: string]: any; // 扩展字段
  };

  @Column({
    type: 'text',
    nullable: true,
    comment: '备注',
  })
  remark?: string;

  // 🆕 拥有此菜单的角色（role_menus 中间表）
  @ManyToMany(() => RoleEntity, (role) => role.menus)
  roles?: RoleEntity[];
}
