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
        refreshToken varchar(500) NULL COMMENT '刷新Token',
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
        displayCondition json NULL COMMENT '菜单显示条件（需要的权限）',
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
        metadata json NULL COMMENT '文件元数据（宽高、时长等）',
        status enum('uploading', 'available', 'processing', 'failed') NOT NULL DEFAULT 'available' COMMENT '文件状态',
        module varchar(100) NULL COMMENT '业务模块标识',
        tags varchar(200) NULL COMMENT '业务标签（用逗号分隔）',
        isPublic tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否公开访问',
        width int NULL COMMENT '图片宽度',
        height int NULL COMMENT '图片高度',
        duration int NULL COMMENT '视频或音频时长（秒）',
        thumbnailPath varchar(500) NULL COMMENT '缩略图存储路径',
        thumbnailUrl varchar(500) NULL COMMENT '缩略图访问URL',
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
      CREATE TABLE dict_types (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(100) NOT NULL COMMENT '字典类型编码',
        name varchar(100) NOT NULL COMMENT '字典类型名称',
        description text NULL COMMENT '描述',
        source enum('platform', 'custom') NOT NULL DEFAULT 'custom' COMMENT '字典来源',
        isEnabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        isSystem tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置（不可删除）',
        sort int NOT NULL DEFAULT 0 COMMENT '排序',
        config json NULL COMMENT '扩展配置',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_dict_types_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE dict_items (
        id int NOT NULL AUTO_INCREMENT,
        dict_type_id int NOT NULL COMMENT '字典类型ID',
        label varchar(100) NOT NULL COMMENT '字典项标签',
        labelEn varchar(100) NULL COMMENT '字典项标签（英文）',
        value varchar(100) NOT NULL COMMENT '字典项值',
        color varchar(50) NULL COMMENT '标签颜色',
        icon varchar(50) NULL COMMENT '图标',
        description text NULL COMMENT '描述',
        status enum('enabled', 'disabled') NOT NULL DEFAULT 'enabled' COMMENT '状态',
        isDefault tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否默认值',
        sort int NOT NULL DEFAULT 0 COMMENT '排序',
        extra json NULL COMMENT '扩展数据',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_dict_items_type_value (dict_type_id, value),
        KEY IDX_dict_items_type_sort (dict_type_id, sort),
        CONSTRAINT FK_dict_items_type FOREIGN KEY (dict_type_id) REFERENCES dict_types(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE system_configs (
        id int NOT NULL AUTO_INCREMENT,
        configKey varchar(100) NOT NULL COMMENT '配置键名',
        configName varchar(100) NOT NULL COMMENT '配置名称',
        configValue text NULL COMMENT '配置值',
        configType enum('text', 'number', 'boolean', 'json', 'array') NOT NULL DEFAULT 'text' COMMENT '配置类型',
        configGroup enum('system', 'business', 'security', 'third_party', 'other') NOT NULL DEFAULT 'other' COMMENT '配置分组',
        description text NULL COMMENT '配置描述',
        defaultValue text NULL COMMENT '默认值',
        isSystem tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否系统内置（不可删除）',
        isEnabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        sort int NOT NULL DEFAULT 0 COMMENT '排序',
        extra json NULL COMMENT '扩展属性',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_system_configs_configKey (configKey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE task_definitions (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(100) NOT NULL COMMENT '任务编码',
        name varchar(150) NOT NULL COMMENT '任务名称',
        description text NULL COMMENT '任务描述',
        type enum('cron') NOT NULL DEFAULT 'cron' COMMENT '任务类型',
        schedule varchar(200) NULL COMMENT 'Cron 表达式或间隔配置',
        payload json NULL COMMENT '执行参数',
        status enum('enabled', 'disabled') NOT NULL DEFAULT 'enabled' COMMENT '任务状态',
        allowManual tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否允许手动触发',
        handler varchar(100) NULL COMMENT '处理器名称',
        lastStatus varchar(50) NULL COMMENT '上次执行状态',
        lastRunAt timestamp NULL COMMENT '上次执行时间',
        nextRunAt timestamp NULL COMMENT '下次执行时间',
        retryPolicy json NULL COMMENT '重试策略配置',
        alertConfig json NULL COMMENT '告警配置',
        timeout int NULL DEFAULT 3600000 COMMENT '任务执行超时时间（毫秒）',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        deletedAt timestamp NULL COMMENT '删除时间',
        deletedBy varchar(50) NULL COMMENT '删除人',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_task_definitions_code (code),
        KEY IDX_task_definitions_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE task_logs (
        id int NOT NULL AUTO_INCREMENT,
        task_id int NOT NULL COMMENT '任务 ID',
        status enum('success', 'failed', 'running') NOT NULL DEFAULT 'running' COMMENT '执行状态',
        message text NULL COMMENT '执行结果或错误信息',
        context json NULL COMMENT '上下文数据',
        startedAt timestamp NULL COMMENT '开始时间',
        finishedAt timestamp NULL COMMENT '结束时间',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        KEY IDX_task_logs_task_created (task_id, createdAt),
        KEY IDX_task_logs_status (status),
        CONSTRAINT FK_task_logs_task FOREIGN KEY (task_id) REFERENCES task_definitions(id) ON DELETE CASCADE
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
        callbackUrl varchar(255) NULL,
        webhookUrl varchar(255) NULL,
        scopes json NULL,
        ipWhitelist json NULL,
        rateLimitPerHour int NOT NULL DEFAULT 1000,
        rateLimitPerDay int NOT NULL DEFAULT 10000,
        totalCalls bigint NOT NULL DEFAULT 0,
        lastCalledAt timestamp NULL,
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

    await queryRunner.query(`
      CREATE TABLE api_call_logs (
        id int NOT NULL AUTO_INCREMENT,
        appId int NOT NULL,
        appName varchar(100) NOT NULL,
        keyId int NULL,
        method varchar(10) NOT NULL,
        endpoint varchar(255) NOT NULL,
        statusCode int NOT NULL,
        responseTime int NOT NULL,
        requestSize bigint NULL,
        responseSize bigint NULL,
        ipAddress varchar(45) NOT NULL,
        userAgent text NULL,
        errorMessage text NULL,
        metadata json NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        createdBy varchar(50) NULL COMMENT '创建人',
        updatedBy varchar(50) NULL COMMENT '更新人',
        PRIMARY KEY (id),
        KEY IDX_api_call_logs_app_created (appId, createdAt),
        KEY IDX_api_call_logs_endpoint_created (endpoint, createdAt),
        KEY IDX_api_call_logs_keyId (keyId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('DROP TABLE IF EXISTS api_call_logs');
    await queryRunner.query('DROP TABLE IF EXISTS api_keys');
    await queryRunner.query('DROP TABLE IF EXISTS api_apps');
    await queryRunner.query('DROP TABLE IF EXISTS notifications');
    await queryRunner.query('DROP TABLE IF EXISTS task_logs');
    await queryRunner.query('DROP TABLE IF EXISTS task_definitions');
    await queryRunner.query('DROP TABLE IF EXISTS system_configs');
    await queryRunner.query('DROP TABLE IF EXISTS dict_items');
    await queryRunner.query('DROP TABLE IF EXISTS dict_types');
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
