import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsuranceTables1800000000000 implements MigrationInterface {
  name = 'AddInsuranceTables1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE insurance_members (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL COMMENT '成员姓名',
        relationship varchar(50) NULL COMMENT '家庭关系',
        linked_user_id int NULL COMMENT '绑定的系统用户',
        remark varchar(500) NULL COMMENT '备注',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deletedAt timestamp NULL COMMENT '删除时间',
        PRIMARY KEY (id),
        KEY IDX_insurance_members_sort_id (sort, id),
        KEY IDX_insurance_members_linked_user_id (linked_user_id),
        CONSTRAINT FK_insurance_members_linked_user FOREIGN KEY (linked_user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE insurance_policies (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(150) NOT NULL COMMENT '保单名称',
        company varchar(100) NULL COMMENT '保险公司',
        policy_no varchar(100) NULL COMMENT '保单号',
        member_id int NOT NULL COMMENT '归属成员',
        type enum('medical','critical_illness','life','accident','auto','home_property','travel','other') NOT NULL COMMENT '险种',
        effective_date date NULL COMMENT '生效日期',
        end_date date NULL COMMENT '到期日期',
        next_payment_date date NULL COMMENT '下次缴费日期',
        payment_amount decimal(12,2) NULL COMMENT '缴费金额',
        owner_user_id int NOT NULL COMMENT '保单负责人',
        remark text NULL COMMENT '备注',
        reminder_channels json NULL COMMENT '提醒渠道',
        send_external_reminder tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否发送外部提醒',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        deletedAt timestamp NULL COMMENT '删除时间',
        PRIMARY KEY (id),
        KEY IDX_insurance_policies_member_type (member_id, type),
        KEY IDX_insurance_policies_end_date (end_date),
        KEY IDX_insurance_policies_next_payment_date (next_payment_date),
        KEY IDX_insurance_policies_owner_user_id (owner_user_id),
        CONSTRAINT FK_insurance_policies_member FOREIGN KEY (member_id) REFERENCES insurance_members(id) ON DELETE RESTRICT,
        CONSTRAINT FK_insurance_policies_owner_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE insurance_policy_attachments (
        id int NOT NULL AUTO_INCREMENT,
        policy_id int NOT NULL COMMENT '保单ID',
        file_id int NOT NULL COMMENT '文件ID',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_insurance_policy_attachments_policy_file (policy_id, file_id),
        KEY IDX_insurance_policy_attachments_file_id (file_id),
        CONSTRAINT FK_insurance_policy_attachments_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE,
        CONSTRAINT FK_insurance_policy_attachments_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE insurance_policy_reminders (
        id int NOT NULL AUTO_INCREMENT,
        policy_id int NOT NULL COMMENT '保单ID',
        reminder_type enum('expiry_30d','expiry_7d','payment_7d','payment_due') NOT NULL COMMENT '提醒类型',
        remind_date date NOT NULL COMMENT '提醒日期',
        recipient_user_id int NOT NULL COMMENT '接收用户',
        sent_at timestamp NULL COMMENT '发送时间',
        notification_id int NULL COMMENT '通知ID',
        last_error varchar(500) NULL COMMENT '最近错误',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY IDX_insurance_policy_reminders_policy_type_date (policy_id, reminder_type, remind_date),
        KEY IDX_insurance_policy_reminders_remind_sent (remind_date, sent_at),
        KEY IDX_insurance_policy_reminders_recipient_user_id (recipient_user_id),
        KEY IDX_insurance_policy_reminders_notification_id (notification_id),
        CONSTRAINT FK_insurance_policy_reminders_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE,
        CONSTRAINT FK_insurance_policy_reminders_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT FK_insurance_policy_reminders_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS insurance_policy_reminders');
    await queryRunner.query('DROP TABLE IF EXISTS insurance_policy_attachments');
    await queryRunner.query('DROP TABLE IF EXISTS insurance_policies');
    await queryRunner.query('DROP TABLE IF EXISTS insurance_members');
  }
}
