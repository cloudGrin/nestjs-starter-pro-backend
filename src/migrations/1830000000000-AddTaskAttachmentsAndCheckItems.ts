import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAttachmentsAndCheckItems1830000000000 implements MigrationInterface {
  name = 'AddTaskAttachmentsAndCheckItems1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE task_attachments (
        id int NOT NULL AUTO_INCREMENT,
        task_id int NOT NULL COMMENT '任务ID',
        file_id int NOT NULL COMMENT '文件ID',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_task_attachments_task_file (task_id, file_id),
        KEY IDX_task_attachments_file_id (file_id),
        CONSTRAINT FK_task_attachments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_task_attachments_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE task_check_items (
        id int NOT NULL AUTO_INCREMENT,
        task_id int NOT NULL COMMENT '任务ID',
        title varchar(200) NOT NULL COMMENT '检查项标题',
        completed tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否完成',
        completed_at timestamp NULL COMMENT '完成时间',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY IDX_task_check_items_task_sort (task_id, sort),
        CONSTRAINT FK_task_check_items_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS task_check_items');
    await queryRunner.query('DROP TABLE IF EXISTS task_attachments');
  }
}
