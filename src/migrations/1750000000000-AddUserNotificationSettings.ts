import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNotificationSettings1750000000000 implements MigrationInterface {
  name = 'AddUserNotificationSettings1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_notification_settings (
        id int NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL COMMENT '用户ID',
        bark_key varchar(255) NULL COMMENT 'Bark 设备 Key',
        feishu_user_id varchar(128) NULL COMMENT '飞书用户 user_id',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_user_notification_settings_user_id (user_id),
        CONSTRAINT FK_user_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS user_notification_settings');
  }
}
