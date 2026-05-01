import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiAccessLogs1780000000000 implements MigrationInterface {
  name = 'AddApiAccessLogs1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE api_access_logs (
        id int NOT NULL AUTO_INCREMENT,
        appId int NOT NULL,
        keyId int NULL,
        keyName varchar(100) NULL,
        keyPrefix varchar(10) NULL,
        keySuffix varchar(8) NULL,
        method varchar(10) NOT NULL,
        path varchar(500) NOT NULL,
        statusCode int NOT NULL,
        durationMs int NOT NULL DEFAULT 0,
        ip varchar(64) NULL,
        userAgent varchar(500) NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY IDX_api_access_logs_app_created_at (appId, createdAt),
        KEY IDX_api_access_logs_app_key_created_at (appId, keyId, createdAt),
        KEY IDX_api_access_logs_app_status_created_at (appId, statusCode, createdAt),
        KEY IDX_api_access_logs_path (path),
        CONSTRAINT FK_api_access_logs_app FOREIGN KEY (appId) REFERENCES api_apps(id) ON DELETE CASCADE,
        CONSTRAINT FK_api_access_logs_key FOREIGN KEY (keyId) REFERENCES api_keys(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS api_access_logs');
  }
}
