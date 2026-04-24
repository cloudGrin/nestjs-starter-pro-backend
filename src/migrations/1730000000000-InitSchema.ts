import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1730000000000 implements MigrationInterface {
  name = 'InitSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id int NOT NULL AUTO_INCREMENT,
        username varchar(50) NOT NULL COMMENT '用户名',
        email varchar(100) NOT NULL COMMENT '邮箱',
        password varchar(200) NOT NULL COMMENT '密码',
        realName varchar(50) NULL COMMENT '姓名',
        nickname varchar(50) NULL COMMENT '昵称',
        avatar varchar(255) NULL COMMENT '头像',
        phone varchar(20) NULL COMMENT '手机号',
        gender enum('male', 'female', 'unknown') NOT NULL DEFAULT 'unknown' COMMENT '性别',
        birthday date NULL COMMENT '出生日期',
        address varchar(255) NULL COMMENT '地址',
        bio text NULL COMMENT '个人简介',
        status enum('active', 'inactive', 'disabled', 'locked') NOT NULL DEFAULT 'active' COMMENT '状态',
        lastLoginAt timestamp NULL COMMENT '最后登录时间',
        lastLoginIp varchar(50) NULL COMMENT '最后登录IP',
        loginAttempts int NOT NULL DEFAULT 0 COMMENT '登录失败次数',
        lockedUntil timestamp NULL COMMENT '锁定截止时间',
        isEmailVerified tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否验证邮箱',
        isPhoneVerified tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否验证手机',
        isTwoFactorEnabled tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否启用双因素认证',
        twoFactorSecret varchar(100) NULL COMMENT '双因素认证密钥',
        settings json NULL COMMENT '用户设置',
        extra json NULL COMMENT '扩展信息',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_users_username (username),
        UNIQUE KEY UQ_users_email (email),
        UNIQUE KEY IDX_users_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE roles (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(50) NOT NULL COMMENT '角色编码',
        name varchar(100) NOT NULL COMMENT '角色名称',
        description text NULL COMMENT '角色描述',
        category enum('system', 'business', 'temp', 'custom') NOT NULL DEFAULT 'business' COMMENT '角色分类',
        sort int NOT NULL DEFAULT 0 COMMENT '排序',
        isActive tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        isSystem tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为系统角色（不可删除）',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_roles_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(100) NOT NULL COMMENT '权限编码（唯一标识）',
        name varchar(100) NOT NULL COMMENT '权限名称',
        type enum('api', 'feature') NOT NULL DEFAULT 'api' COMMENT '权限类型',
        module varchar(50) NOT NULL COMMENT '所属模块',
        httpMeta json NULL COMMENT 'HTTP元数据（方法、路径）',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        isActive tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        isSystem tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否为系统内置（不可删除）',
        description text NULL COMMENT '权限描述',
        extra json NULL COMMENT '扩展配置',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_permissions_code (code),
        KEY IDX_permissions_module_code (module, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE menus (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL COMMENT '菜单名称',
        path varchar(200) NULL COMMENT '菜单路径',
        type enum('directory', 'menu') NOT NULL DEFAULT 'menu' COMMENT '菜单类型',
        icon varchar(50) NULL COMMENT '菜单图标',
        component varchar(200) NULL COMMENT '组件路径',
        parent_id int NULL COMMENT '父菜单ID',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        isVisible tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否显示',
        isActive tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        isExternal tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否外链',
        isCache tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否缓存页面',
        meta json NULL COMMENT '路由元数据',
        remark text NULL COMMENT '备注',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        KEY IDX_menus_parent_sort (parent_id, sort),
        CONSTRAINT FK_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id int NOT NULL,
        role_id int NOT NULL,
        PRIMARY KEY (user_id, role_id),
        KEY IDX_user_roles_user_id (user_id),
        KEY IDX_user_roles_role_id (role_id),
        CONSTRAINT FK_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id int NOT NULL,
        permission_id int NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        KEY IDX_role_permissions_role_id (role_id),
        KEY IDX_role_permissions_permission_id (permission_id),
        CONSTRAINT FK_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT FK_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE role_menus (
        role_id int NOT NULL,
        menu_id int NOT NULL,
        PRIMARY KEY (role_id, menu_id),
        KEY IDX_role_menus_role_id (role_id),
        KEY IDX_role_menus_menu_id (menu_id),
        CONSTRAINT FK_role_menus_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT FK_role_menus_menu FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id int NOT NULL AUTO_INCREMENT,
        token varchar(500) NOT NULL COMMENT '刷新Token',
        userId int NOT NULL COMMENT '用户ID',
        deviceId varchar(50) NULL COMMENT '设备ID',
        userAgent varchar(255) NULL COMMENT 'User Agent',
        ipAddress varchar(50) NULL COMMENT 'IP地址',
        expiresAt timestamp NOT NULL COMMENT '过期时间',
        isRevoked tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已撤销',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_refresh_tokens_token (token),
        KEY IDX_refresh_tokens_token_userId (token, userId),
        CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE files (
        id int NOT NULL AUTO_INCREMENT,
        originalName varchar(255) NOT NULL COMMENT '原始文件名',
        filename varchar(255) NOT NULL COMMENT '存储后的文件名',
        path varchar(500) NOT NULL COMMENT '文件存储路径（相对路径）',
        url varchar(500) NULL COMMENT '文件访问URL',
        mimeType varchar(100) NOT NULL COMMENT 'MIME 类型',
        size bigint NOT NULL COMMENT '文件大小（字节）',
        category varchar(50) NOT NULL COMMENT '文件类别',
        storage enum('local', 'oss') NOT NULL DEFAULT 'local' COMMENT '存储类型',
        hash varchar(64) NULL COMMENT '文件哈希值',
        metadata json NULL COMMENT '文件元数据',
        status enum('uploading', 'available', 'processing', 'failed') NOT NULL DEFAULT 'available' COMMENT '文件状态',
        module varchar(100) NULL COMMENT '业务模块标识',
        tags varchar(200) NULL COMMENT '业务标签（用逗号分隔）',
        isPublic tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否公开访问',
        remark varchar(500) NULL COMMENT '备注信息',
        uploaderId int NULL COMMENT '上传者ID',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        KEY IDX_files_hash (hash),
        KEY IDX_files_storage (storage),
        KEY IDX_files_category (category),
        KEY IDX_files_filename (filename),
        KEY IDX_files_uploaderId (uploaderId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(150) NOT NULL COMMENT '通知标题',
        content text NOT NULL COMMENT '通知内容',
        type enum('system', 'message', 'reminder') NOT NULL DEFAULT 'system' COMMENT '通知类型',
        status enum('unread', 'read') NOT NULL DEFAULT 'unread' COMMENT '通知状态',
        priority enum('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal' COMMENT '通知优先级',
        channels json NULL COMMENT '发送渠道列表',
        recipient_id int NULL COMMENT '接收者ID（空表示广播）',
        sender_id int NULL COMMENT '发送者ID',
        isSystem tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统通知',
        readAt timestamp NULL COMMENT '读取时间',
        expireAt timestamp NULL COMMENT '过期时间',
        metadata json NULL COMMENT '扩展数据（跳转链接、参数等）',
        sendExternalWhenOffline tinyint(1) NOT NULL DEFAULT 0 COMMENT '离线时是否触发外部渠道',
        deliveryResults json NULL COMMENT '外部渠道发送结果',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        KEY IDX_notifications_recipient_status (recipient_id, status),
        KEY IDX_notifications_type (type),
        KEY IDX_notifications_isSystem (isSystem),
        KEY IDX_notifications_sender_id (sender_id),
        CONSTRAINT FK_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE api_apps (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        description text NULL,
        scopes json NULL,
        isActive tinyint(1) NOT NULL DEFAULT 1,
        ownerId int NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_api_apps_name (name),
        KEY IDX_api_apps_ownerId (ownerId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE api_keys (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        keyHash varchar(255) NOT NULL,
        prefix varchar(10) NOT NULL,
        suffix varchar(8) NOT NULL,
        scopes json NULL,
        expiresAt timestamp NULL,
        lastUsedAt timestamp NULL,
        usageCount bigint NOT NULL DEFAULT 0,
        isActive tinyint(1) NOT NULL DEFAULT 1,
        appId int NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_api_keys_keyHash (keyHash),
        KEY IDX_api_keys_appId (appId),
        CONSTRAINT FK_api_keys_app FOREIGN KEY (appId) REFERENCES api_apps(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('DROP TABLE IF EXISTS api_keys');
    await queryRunner.query('DROP TABLE IF EXISTS api_apps');
    await queryRunner.query('DROP TABLE IF EXISTS notifications');
    await queryRunner.query('DROP TABLE IF EXISTS files');
    await queryRunner.query('DROP TABLE IF EXISTS refresh_tokens');
    await queryRunner.query('DROP TABLE IF EXISTS role_menus');
    await queryRunner.query('DROP TABLE IF EXISTS role_permissions');
    await queryRunner.query('DROP TABLE IF EXISTS user_roles');
    await queryRunner.query('DROP TABLE IF EXISTS menus');
    await queryRunner.query('DROP TABLE IF EXISTS permissions');
    await queryRunner.query('DROP TABLE IF EXISTS roles');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}
