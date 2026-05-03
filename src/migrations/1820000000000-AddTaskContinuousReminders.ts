import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskContinuousReminders1820000000000 implements MigrationInterface {
  name = 'AddTaskContinuousReminders1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
        ADD next_reminder_at timestamp NULL COMMENT '下一次提醒时间' AFTER reminded_at,
        ADD continuous_reminder_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否持续提醒' AFTER next_reminder_at,
        ADD continuous_reminder_interval_minutes int NOT NULL DEFAULT 30 COMMENT '持续提醒间隔分钟' AFTER continuous_reminder_enabled
    `);
    await queryRunner.query(`
      UPDATE tasks
      SET next_reminder_at = remind_at
      WHERE remind_at IS NOT NULL
        AND status = 'pending'
        AND reminded_at IS NULL
        AND deletedAt IS NULL
    `);
    await queryRunner.query('ALTER TABLE tasks DROP INDEX IDX_tasks_remind_reminded');
    await queryRunner.query(
      'ALTER TABLE tasks ADD INDEX IDX_tasks_next_reminder_at (next_reminder_at)',
    );
    await queryRunner.query(`
      ALTER TABLE tasks
        DROP COLUMN reminder_channels,
        DROP COLUMN send_external_reminder
    `);
    await queryRunner.query(`
      ALTER TABLE insurance_policies
        DROP COLUMN reminder_channels,
        DROP COLUMN send_external_reminder
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE insurance_policies
        ADD reminder_channels json NULL COMMENT '提醒渠道' AFTER remark,
        ADD send_external_reminder tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否发送外部提醒' AFTER reminder_channels
    `);
    await queryRunner.query(`
      ALTER TABLE tasks
        ADD reminder_channels json NULL COMMENT '提醒渠道' AFTER recurrence_interval,
        ADD send_external_reminder tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否发送外部提醒' AFTER reminder_channels
    `);
    await queryRunner.query('ALTER TABLE tasks DROP INDEX IDX_tasks_next_reminder_at');
    await queryRunner.query(
      'ALTER TABLE tasks ADD INDEX IDX_tasks_remind_reminded (remind_at, reminded_at)',
    );
    await queryRunner.query(`
      ALTER TABLE tasks
        DROP COLUMN continuous_reminder_interval_minutes,
        DROP COLUMN continuous_reminder_enabled,
        DROP COLUMN next_reminder_at
    `);
  }
}
