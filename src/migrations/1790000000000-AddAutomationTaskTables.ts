import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomationTaskTables1790000000000 implements MigrationInterface {
  name = 'AddAutomationTaskTables1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE automation_task_configs (
        id int NOT NULL AUTO_INCREMENT,
        task_key varchar(100) NOT NULL COMMENT '任务唯一编码',
        enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否启用定时执行',
        cron_expression varchar(120) NOT NULL COMMENT 'Cron 表达式',
        params json NULL COMMENT '任务参数',
        is_running tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否正在运行',
        last_status enum('never', 'running', 'success', 'failed', 'skipped') NOT NULL DEFAULT 'never' COMMENT '最近执行状态',
        last_started_at timestamp NULL COMMENT '最近开始时间',
        last_finished_at timestamp NULL COMMENT '最近结束时间',
        last_duration_ms int NULL COMMENT '最近耗时毫秒',
        last_message varchar(500) NULL COMMENT '最近执行消息',
        last_error text NULL COMMENT '最近错误',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_automation_task_configs_task_key (task_key),
        KEY IDX_automation_task_configs_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE automation_task_logs (
        id int NOT NULL AUTO_INCREMENT,
        task_key varchar(100) NOT NULL COMMENT '任务唯一编码',
        trigger_type enum('schedule', 'manual', 'system') NOT NULL COMMENT '触发方式',
        status enum('success', 'failed', 'skipped') NOT NULL COMMENT '执行状态',
        started_at timestamp NOT NULL COMMENT '开始时间',
        finished_at timestamp NOT NULL COMMENT '结束时间',
        duration_ms int NOT NULL DEFAULT 0 COMMENT '耗时毫秒',
        params_snapshot json NULL COMMENT '参数快照',
        result_message varchar(500) NULL COMMENT '结果消息',
        error_message text NULL COMMENT '错误消息',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY IDX_automation_task_logs_task_created (task_key, createdAt),
        KEY IDX_automation_task_logs_status_created (status, createdAt),
        KEY IDX_automation_task_logs_trigger_created (trigger_type, createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS automation_task_logs');
    await queryRunner.query('DROP TABLE IF EXISTS automation_task_configs');
  }
}
