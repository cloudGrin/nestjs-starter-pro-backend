import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 初始化核心权限模块表
 * 包含: users, roles, permissions, menus 及其关联表
 */
export class InitCorePermissionTables1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建 users 表
    const hasUsersTable = await queryRunner.hasTable('users');
    if (hasUsersTable) {
      console.log('⏭️  users表已存在，跳过创建');
      return; // 如果核心表已存在，说明数据库已初始化，跳过整个migration
    }

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
            comment: '用户名',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: '邮箱',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '200',
            comment: '密码',
          },
          {
            name: 'realName',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '姓名',
          },
          {
            name: 'nickname',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '昵称',
          },
          {
            name: 'avatar',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: '头像',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: '手机号',
          },
          {
            name: 'gender',
            type: 'enum',
            enum: ['male', 'female', 'unknown'],
            default: "'unknown'",
            comment: '性别',
          },
          {
            name: 'birthday',
            type: 'date',
            isNullable: true,
            comment: '出生日期',
          },
          {
            name: 'address',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: '地址',
          },
          {
            name: 'bio',
            type: 'text',
            isNullable: true,
            comment: '个人简介',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'locked', 'pending'],
            default: "'active'",
            comment: '状态',
          },
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
            comment: '最后登录时间',
          },
          {
            name: 'lastLoginIp',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '最后登录IP',
          },
          {
            name: 'loginAttempts',
            type: 'int',
            default: 0,
            comment: '登录失败次数',
          },
          {
            name: 'lockedUntil',
            type: 'timestamp',
            isNullable: true,
            comment: '锁定截止时间',
          },
          {
            name: 'isEmailVerified',
            type: 'boolean',
            default: false,
            comment: '是否验证邮箱',
          },
          {
            name: 'isPhoneVerified',
            type: 'boolean',
            default: false,
            comment: '是否验证手机',
          },
          {
            name: 'isTwoFactorEnabled',
            type: 'boolean',
            default: false,
            comment: '是否启用双因素认证',
          },
          {
            name: 'twoFactorSecret',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '双因素认证密钥',
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '刷新Token',
          },
          {
            name: 'settings',
            type: 'json',
            isNullable: true,
            comment: '用户设置',
          },
          {
            name: 'extra',
            type: 'json',
            isNullable: true,
            comment: '扩展信息',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '创建人',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '更新人',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
            comment: '删除时间',
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '删除人',
          },
        ],
      }),
      true,
    );

    // 创建 users 表的索引
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_phone',
        columnNames: ['phone'],
        isUnique: true,
        where: 'phone IS NOT NULL',
      }),
    );

    // 2. 创建 roles 表
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
            comment: '角色编码',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            comment: '角色名称',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '角色描述',
          },
          {
            name: 'category',
            type: 'enum',
            enum: ['system', 'business', 'temp', 'custom'],
            default: "'business'",
            comment: '角色分类',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            comment: '是否为系统角色（不可删除）',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '创建人',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '更新人',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
            comment: '删除时间',
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '删除人',
          },
        ],
      }),
      true,
    );

    // 3. 创建 permissions 表
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: '权限编码（唯一标识）',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            comment: '权限名称',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['api', 'feature'],
            default: "'api'",
            comment: '权限类型',
          },
          {
            name: 'module',
            type: 'varchar',
            length: '50',
            comment: '所属模块',
          },
          {
            name: 'httpMeta',
            type: 'json',
            isNullable: true,
            comment: 'HTTP元数据（方法、路径）',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序值',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            comment: '是否为系统内置（不可删除）',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '权限描述',
          },
          {
            name: 'extra',
            type: 'json',
            isNullable: true,
            comment: '扩展配置',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '创建人',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '更新人',
          },
        ],
      }),
      true,
    );

    // 创建 permissions 表的索引
    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'IDX_permissions_module_code',
        columnNames: ['module', 'code'],
      }),
    );

    // 4. 创建 menus 表
    await queryRunner.createTable(
      new Table({
        name: 'menus',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            comment: '菜单名称',
          },
          {
            name: 'path',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '菜单路径',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['directory', 'menu'],
            default: "'menu'",
            comment: '菜单类型',
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '菜单图标',
          },
          {
            name: 'component',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '组件路径',
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
            comment: '父菜单ID',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序值',
          },
          {
            name: 'isVisible',
            type: 'boolean',
            default: true,
            comment: '是否显示',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'isExternal',
            type: 'boolean',
            default: false,
            comment: '是否外链',
          },
          {
            name: 'isCache',
            type: 'boolean',
            default: false,
            comment: '是否缓存页面',
          },
          {
            name: 'displayCondition',
            type: 'json',
            isNullable: true,
            comment: '菜单显示条件（需要的权限）',
          },
          {
            name: 'meta',
            type: 'json',
            isNullable: true,
            comment: '路由元数据',
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
            comment: '备注',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
          {
            name: 'createdBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '创建人',
          },
          {
            name: 'updatedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '更新人',
          },
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
            comment: '删除时间',
          },
          {
            name: 'deletedBy',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '删除人',
          },
        ],
      }),
      true,
    );

    // 创建 menus 表的索引
    await queryRunner.createIndex(
      'menus',
      new TableIndex({
        name: 'IDX_menus_parent_sort',
        columnNames: ['parent_id', 'sort'],
      }),
    );

    // 创建 menus 表的外键
    await queryRunner.createForeignKey(
      'menus',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'menus',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 5. 创建 user_roles 中间表
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'role_id',
            type: 'int',
          },
        ],
      }),
      true,
    );

    // 创建 user_roles 主键
    await queryRunner.createPrimaryKey('user_roles', ['user_id', 'role_id']);

    // 创建 user_roles 索引
    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_roles',
      new TableIndex({
        name: 'IDX_user_roles_role_id',
        columnNames: ['role_id'],
      }),
    );

    // 创建 user_roles 外键
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // 6. 创建 role_permissions 中间表
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'permission_id',
            type: 'int',
          },
        ],
      }),
      true,
    );

    // 创建 role_permissions 主键
    await queryRunner.createPrimaryKey('role_permissions', ['role_id', 'permission_id']);

    // 创建 role_permissions 索引
    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_role_permissions_role_id',
        columnNames: ['role_id'],
      }),
    );

    await queryRunner.createIndex(
      'role_permissions',
      new TableIndex({
        name: 'IDX_role_permissions_permission_id',
        columnNames: ['permission_id'],
      }),
    );

    // 创建 role_permissions 外键
    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'role_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // 7. 创建 role_menus 中间表
    await queryRunner.createTable(
      new Table({
        name: 'role_menus',
        columns: [
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'menu_id',
            type: 'int',
          },
        ],
      }),
      true,
    );

    // 创建 role_menus 主键
    await queryRunner.createPrimaryKey('role_menus', ['role_id', 'menu_id']);

    // 创建 role_menus 索引
    await queryRunner.createIndex(
      'role_menus',
      new TableIndex({
        name: 'IDX_role_menus_role_id',
        columnNames: ['role_id'],
      }),
    );

    await queryRunner.createIndex(
      'role_menus',
      new TableIndex({
        name: 'IDX_role_menus_menu_id',
        columnNames: ['menu_id'],
      }),
    );

    // 创建 role_menus 外键
    await queryRunner.createForeignKey(
      'role_menus',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'role_menus',
      new TableForeignKey({
        columnNames: ['menu_id'],
        referencedTableName: 'menus',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除顺序：先删除中间表和外键，再删除主表

    // 删除 role_menus 表
    await queryRunner.dropTable('role_menus', true);

    // 删除 role_permissions 表
    await queryRunner.dropTable('role_permissions', true);

    // 删除 user_roles 表
    await queryRunner.dropTable('user_roles', true);

    // 删除 menus 表（会自动删除外键）
    await queryRunner.dropTable('menus', true);

    // 删除 permissions 表
    await queryRunner.dropTable('permissions', true);

    // 删除 roles 表
    await queryRunner.dropTable('roles', true);

    // 删除 users 表
    await queryRunner.dropTable('users', true);
  }
}
