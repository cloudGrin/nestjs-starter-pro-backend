import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * 初始化业务模块表
 * 包含: refresh_tokens, files, dict_types, dict_items, system_configs,
 *       task_definitions, task_logs, notifications,
 *       api_apps, api_keys, api_call_logs
 */
export class InitBusinessModuleTables1730000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查是否已存在业务表
    const hasRefreshTokensTable = await queryRunner.hasTable('refresh_tokens');
    if (hasRefreshTokensTable) {
      console.log('⏭️  业务模块表已存在，跳过创建');
      return; // 如果业务表已存在，跳过整个migration
    }

    // 1. 创建 refresh_tokens 表
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
            isUnique: true,
            comment: '刷新Token',
          },
          {
            name: 'userId',
            type: 'int',
            comment: '用户ID',
          },
          {
            name: 'deviceId',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '设备ID',
          },
          {
            name: 'userAgent',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'User Agent',
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'IP地址',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            comment: '过期时间',
          },
          {
            name: 'isRevoked',
            type: 'boolean',
            default: false,
            comment: '是否已撤销',
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

    // 创建 refresh_tokens 索引
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_token_userId',
        columnNames: ['token', 'userId'],
      }),
    );

    // 创建 refresh_tokens 外键
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. 创建 files 表
    await queryRunner.createTable(
      new Table({
        name: 'files',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'originalName',
            type: 'varchar',
            length: '255',
            comment: '原始文件名',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
            comment: '存储后的文件名',
          },
          {
            name: 'path',
            type: 'varchar',
            length: '500',
            comment: '文件存储路径（相对路径）',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '文件访问URL',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '100',
            comment: 'MIME 类型',
          },
          {
            name: 'size',
            type: 'bigint',
            comment: '文件大小（字节）',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
            comment: '文件类别',
          },
          {
            name: 'storage',
            type: 'enum',
            enum: ['local', 'oss', 'minio'],
            default: "'local'",
            comment: '存储类型',
          },
          {
            name: 'hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '文件哈希值',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
            comment: '文件元数据（宽高、时长等）',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['uploading', 'available', 'processing', 'failed'],
            default: "'available'",
            comment: '文件状态',
          },
          {
            name: 'module',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '业务模块标识',
          },
          {
            name: 'tags',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '业务标签（用逗号分隔）',
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: false,
            comment: '是否公开访问',
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
            comment: '图片宽度',
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
            comment: '图片高度',
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
            comment: '视频或音频时长（秒）',
          },
          {
            name: 'thumbnailPath',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '缩略图存储路径',
          },
          {
            name: 'thumbnailUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '缩略图访问URL',
          },
          {
            name: 'remark',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '备注信息',
          },
          {
            name: 'uploaderId',
            type: 'int',
            isNullable: true,
            comment: '上传者ID',
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

    // 创建 files 表索引
    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_hash',
        columnNames: ['hash'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_storage',
        columnNames: ['storage'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_filename',
        columnNames: ['filename'],
      }),
    );

    await queryRunner.createIndex(
      'files',
      new TableIndex({
        name: 'IDX_files_uploaderId',
        columnNames: ['uploaderId'],
      }),
    );

    // 3. 创建 dict_types 表
    await queryRunner.createTable(
      new Table({
        name: 'dict_types',
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
            comment: '字典类型编码',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            comment: '字典类型名称',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '描述',
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['platform', 'custom'],
            default: "'custom'",
            comment: '字典来源',
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            comment: '是否系统内置（不可删除）',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序',
          },
          {
            name: 'config',
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

    // 4. 创建 dict_items 表
    await queryRunner.createTable(
      new Table({
        name: 'dict_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'dict_type_id',
            type: 'int',
            comment: '字典类型ID',
          },
          {
            name: 'label',
            type: 'varchar',
            length: '100',
            comment: '字典项标签',
          },
          {
            name: 'labelEn',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '字典项标签（英文）',
          },
          {
            name: 'value',
            type: 'varchar',
            length: '100',
            comment: '字典项值',
          },
          {
            name: 'color',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '标签颜色',
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '图标',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '描述',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['enabled', 'disabled'],
            default: "'enabled'",
            comment: '状态',
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
            comment: '是否默认值',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序',
          },
          {
            name: 'extra',
            type: 'json',
            isNullable: true,
            comment: '扩展数据',
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

    // 创建 dict_items 唯一索引
    await queryRunner.createIndex(
      'dict_items',
      new TableIndex({
        name: 'UQ_dict_items_dict_type_id_value',
        columnNames: ['dict_type_id', 'value'],
        isUnique: true,
      }),
    );

    // 创建 dict_items 普通索引
    await queryRunner.createIndex(
      'dict_items',
      new TableIndex({
        name: 'IDX_dict_items_dict_type_id_sort',
        columnNames: ['dict_type_id', 'sort'],
      }),
    );

    // 创建 dict_items 外键
    await queryRunner.createForeignKey(
      'dict_items',
      new TableForeignKey({
        columnNames: ['dict_type_id'],
        referencedTableName: 'dict_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 5. 创建 system_configs 表
    await queryRunner.createTable(
      new Table({
        name: 'system_configs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'configKey',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: '配置键名',
          },
          {
            name: 'configName',
            type: 'varchar',
            length: '100',
            comment: '配置名称',
          },
          {
            name: 'configValue',
            type: 'text',
            isNullable: true,
            comment: '配置值',
          },
          {
            name: 'configType',
            type: 'enum',
            enum: ['text', 'number', 'boolean', 'json', 'array'],
            default: "'text'",
            comment: '配置类型',
          },
          {
            name: 'configGroup',
            type: 'enum',
            enum: ['system', 'business', 'security', 'third_party', 'other'],
            default: "'other'",
            comment: '配置分组',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '配置描述',
          },
          {
            name: 'defaultValue',
            type: 'text',
            isNullable: true,
            comment: '默认值',
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            comment: '是否系统内置（不可删除）',
          },
          {
            name: 'isEnabled',
            type: 'boolean',
            default: true,
            comment: '是否启用',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            comment: '排序',
          },
          {
            name: 'extra',
            type: 'json',
            isNullable: true,
            comment: '扩展属性',
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

    // 创建 system_configs 索引
    await queryRunner.createIndex(
      'system_configs',
      new TableIndex({
        name: 'IDX_system_configs_configKey',
        columnNames: ['configKey'],
        isUnique: true,
      }),
    );

    // 6. 创建 task_definitions 表
    await queryRunner.createTable(
      new Table({
        name: 'task_definitions',
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
            comment: '任务编码',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
            comment: '任务名称',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '任务描述',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['cron', 'interval', 'timeout'],
            default: "'cron'",
            comment: '任务类型',
          },
          {
            name: 'schedule',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: 'Cron 表达式或间隔配置',
          },
          {
            name: 'payload',
            type: 'json',
            isNullable: true,
            comment: '执行参数',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['enabled', 'disabled'],
            default: "'enabled'",
            comment: '任务状态',
          },
          {
            name: 'allowManual',
            type: 'boolean',
            default: false,
            comment: '是否允许手动触发',
          },
          {
            name: 'handler',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '处理器名称',
          },
          {
            name: 'lastStatus',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '上次执行状态',
          },
          {
            name: 'lastRunAt',
            type: 'timestamp',
            isNullable: true,
            comment: '上次执行时间',
          },
          {
            name: 'nextRunAt',
            type: 'timestamp',
            isNullable: true,
            comment: '下次执行时间',
          },
          {
            name: 'retryPolicy',
            type: 'json',
            isNullable: true,
            comment: '重试策略配置',
          },
          {
            name: 'alertConfig',
            type: 'json',
            isNullable: true,
            comment: '告警配置',
          },
          {
            name: 'timeout',
            type: 'int',
            isNullable: true,
            default: 3600000,
            comment: '任务执行超时时间（毫秒）',
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

    // 创建 task_definitions 索引
    await queryRunner.createIndex(
      'task_definitions',
      new TableIndex({
        name: 'IDX_task_definitions_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'task_definitions',
      new TableIndex({
        name: 'IDX_task_definitions_status',
        columnNames: ['status'],
      }),
    );

    // 7. 创建 task_logs 表
    await queryRunner.createTable(
      new Table({
        name: 'task_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'task_id',
            type: 'int',
            comment: '任务 ID',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed', 'running'],
            default: "'running'",
            comment: '执行状态',
          },
          {
            name: 'message',
            type: 'text',
            isNullable: true,
            comment: '执行结果或错误信息',
          },
          {
            name: 'context',
            type: 'json',
            isNullable: true,
            comment: '上下文数据',
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
            comment: '开始时间',
          },
          {
            name: 'finishedAt',
            type: 'timestamp',
            isNullable: true,
            comment: '结束时间',
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

    // 创建 task_logs 索引
    await queryRunner.createIndex(
      'task_logs',
      new TableIndex({
        name: 'IDX_task_logs_task_id_createdAt',
        columnNames: ['task_id', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'task_logs',
      new TableIndex({
        name: 'IDX_task_logs_status',
        columnNames: ['status'],
      }),
    );

    // 创建 task_logs 外键
    await queryRunner.createForeignKey(
      'task_logs',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedTableName: 'task_definitions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 8. 创建 notifications 表
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '150',
            comment: '通知标题',
          },
          {
            name: 'content',
            type: 'text',
            comment: '通知内容',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['system', 'message', 'reminder'],
            default: "'system'",
            comment: '通知类型',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['unread', 'read'],
            default: "'unread'",
            comment: '通知状态',
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'normal', 'high', 'urgent'],
            default: "'normal'",
            comment: '通知优先级',
          },
          {
            name: 'channels',
            type: 'json',
            isNullable: true,
            comment: '发送渠道列表',
          },
          {
            name: 'recipient_id',
            type: 'int',
            isNullable: true,
            comment: '接收者ID（空表示广播）',
          },
          {
            name: 'sender_id',
            type: 'int',
            isNullable: true,
            comment: '发送者ID',
          },
          {
            name: 'isSystem',
            type: 'boolean',
            default: false,
            comment: '是否系统通知',
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
            comment: '读取时间',
          },
          {
            name: 'expireAt',
            type: 'timestamp',
            isNullable: true,
            comment: '过期时间',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
            comment: '扩展数据（跳转链接、参数等）',
          },
          {
            name: 'sendExternalWhenOffline',
            type: 'boolean',
            default: false,
            comment: '离线时是否触发外部渠道',
          },
          {
            name: 'deliveryResults',
            type: 'json',
            isNullable: true,
            comment: '外部渠道发送结果',
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

    // 创建 notifications 索引
    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_recipient_id_status',
        columnNames: ['recipient_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'notifications',
      new TableIndex({
        name: 'IDX_notifications_isSystem',
        columnNames: ['isSystem'],
      }),
    );

    // 创建 notifications 外键
    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['recipient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 9. 创建 api_apps 表
    await queryRunner.createTable(
      new Table({
        name: 'api_apps',
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
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'callbackUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'webhookUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'scopes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ipWhitelist',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'rateLimitPerHour',
            type: 'int',
            default: 1000,
          },
          {
            name: 'rateLimitPerDay',
            type: 'int',
            default: 10000,
          },
          {
            name: 'totalCalls',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'lastCalledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'ownerId',
            type: 'int',
            isNullable: true,
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

    // 创建 api_apps 索引
    await queryRunner.createIndex(
      'api_apps',
      new TableIndex({
        name: 'IDX_api_apps_name',
        columnNames: ['name'],
      }),
    );

    // 10. 创建 api_keys 表
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
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
          },
          {
            name: 'keyHash',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'prefix',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'suffix',
            type: 'varchar',
            length: '8',
          },
          {
            name: 'scopes',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'usageCount',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'appId',
            type: 'int',
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

    // 创建 api_keys 索引
    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({
        name: 'IDX_api_keys_keyHash',
        columnNames: ['keyHash'],
      }),
    );

    // 创建 api_keys 外键
    await queryRunner.createForeignKey(
      'api_keys',
      new TableForeignKey({
        columnNames: ['appId'],
        referencedTableName: 'api_apps',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 11. 创建 api_call_logs 表
    await queryRunner.createTable(
      new Table({
        name: 'api_call_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'appId',
            type: 'int',
          },
          {
            name: 'appName',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'keyId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'method',
            type: 'varchar',
            length: '10',
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'statusCode',
            type: 'int',
          },
          {
            name: 'responseTime',
            type: 'int',
          },
          {
            name: 'requestSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'responseSize',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
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

    // 创建 api_call_logs 索引
    await queryRunner.createIndex(
      'api_call_logs',
      new TableIndex({
        name: 'IDX_api_call_logs_appId_createdAt',
        columnNames: ['appId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'api_call_logs',
      new TableIndex({
        name: 'IDX_api_call_logs_endpoint_createdAt',
        columnNames: ['endpoint', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除顺序：从依赖表到主表

    // 删除 API 相关表
    await queryRunner.dropTable('api_call_logs', true);
    await queryRunner.dropTable('api_keys', true);
    await queryRunner.dropTable('api_apps', true);

    // 删除通知表
    await queryRunner.dropTable('notifications', true);

    // 删除任务表
    await queryRunner.dropTable('task_logs', true);
    await queryRunner.dropTable('task_definitions', true);

    // 删除配置表
    await queryRunner.dropTable('system_configs', true);

    // 删除字典表
    await queryRunner.dropTable('dict_items', true);
    await queryRunner.dropTable('dict_types', true);

    // 删除文件表
    await queryRunner.dropTable('files', true);

    // 删除认证表
    await queryRunner.dropTable('refresh_tokens', true);
  }
}
