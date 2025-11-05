import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 更新用户状态枚举
 * 问题：数据库定义的枚举是 ['active', 'inactive', 'locked', 'pending']
 * 但后端代码使用的是 ['active', 'inactive', 'disabled', 'locked']
 *
 * 修复：
 * 1. 将 'pending' 改为 'disabled'
 * 2. 将所有现有的 'pending' 数据更新为 'inactive'
 */
export class UpdateUserStatusEnum1730466000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 先将所有 'pending' 状态改为 'inactive'（如果有的话）
    await queryRunner.query(`
      UPDATE users
      SET status = 'inactive'
      WHERE status = 'pending'
    `);

    // 2. 修改枚举定义
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('active', 'inactive', 'disabled', 'locked')
      NOT NULL DEFAULT 'active'
      COMMENT '状态'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：将 'disabled' 改回 'pending'
    await queryRunner.query(`
      UPDATE users
      SET status = 'pending'
      WHERE status = 'disabled'
    `);

    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('active', 'inactive', 'locked', 'pending')
      NOT NULL DEFAULT 'active'
      COMMENT '状态'
    `);
  }
}
