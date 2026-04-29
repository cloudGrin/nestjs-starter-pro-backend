import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskTables1740000000000 implements MigrationInterface {
  name = 'AddTaskTables1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE task_lists (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL COMMENT '清单名称',
        scope enum('personal', 'family') NOT NULL DEFAULT 'personal' COMMENT '清单范围',
        color varchar(30) NULL COMMENT '清单颜色',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        isArchived tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否归档',
        owner_id int NULL COMMENT '清单创建者',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deletedAt timestamp NULL COMMENT '删除时间',
        PRIMARY KEY (id),
        KEY IDX_task_lists_scope_sort (scope, sort),
        KEY IDX_task_lists_owner_id (owner_id),
        CONSTRAINT FK_task_lists_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE tasks (
        id int NOT NULL AUTO_INCREMENT,
        title varchar(200) NOT NULL COMMENT '任务标题',
        description text NULL COMMENT '任务描述',
        list_id int NOT NULL COMMENT '所属清单',
        creator_id int NULL COMMENT '创建者',
        assignee_id int NULL COMMENT '负责人',
        status enum('pending', 'completed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
        task_type enum('task', 'anniversary') NOT NULL DEFAULT 'task' COMMENT '任务类型',
        due_at timestamp NULL COMMENT '到期时间',
        remind_at timestamp NULL COMMENT '提醒时间',
        reminded_at timestamp NULL COMMENT '已提醒时间',
        completed_at timestamp NULL COMMENT '完成时间',
        important tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否重要',
        urgent tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否紧急',
        tags json NULL COMMENT '任务标签',
        recurrence_type enum('none', 'daily', 'weekly', 'monthly', 'yearly', 'weekdays', 'custom') NOT NULL DEFAULT 'none' COMMENT '重复类型',
        recurrence_interval int NULL COMMENT '重复间隔',
        reminder_channels json NULL COMMENT '提醒渠道',
        send_external_reminder tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否发送外部提醒',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deletedAt timestamp NULL COMMENT '删除时间',
        PRIMARY KEY (id),
        KEY IDX_tasks_list_status (list_id, status),
        KEY IDX_tasks_assignee_status (assignee_id, status),
        KEY IDX_tasks_due_at (due_at),
        KEY IDX_tasks_remind_reminded (remind_at, reminded_at),
        KEY IDX_tasks_task_type (task_type),
        KEY IDX_tasks_creator_id (creator_id),
        CONSTRAINT FK_tasks_list FOREIGN KEY (list_id) REFERENCES task_lists(id) ON DELETE CASCADE,
        CONSTRAINT FK_tasks_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT FK_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE task_completions (
        id int NOT NULL AUTO_INCREMENT,
        task_id int NOT NULL COMMENT '任务ID',
        completed_by_id int NULL COMMENT '完成人',
        completed_at timestamp NOT NULL COMMENT '完成时间',
        occurrence_due_at timestamp NULL COMMENT '本次应完成时间',
        next_due_at timestamp NULL COMMENT '下一次应完成时间',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY IDX_task_completions_task_completed (task_id, completed_at),
        KEY IDX_task_completions_completed_by_id (completed_by_id),
        CONSTRAINT FK_task_completions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_task_completions_completed_by FOREIGN KEY (completed_by_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS task_completions');
    await queryRunner.query('DROP TABLE IF EXISTS tasks');
    await queryRunner.query('DROP TABLE IF EXISTS task_lists');
  }
}
