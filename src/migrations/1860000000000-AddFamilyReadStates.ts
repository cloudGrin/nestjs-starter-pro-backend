import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyReadStates1860000000000 implements MigrationInterface {
  name = 'AddFamilyReadStates1860000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE family_read_states (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        user_id int NOT NULL COMMENT '用户ID',
        last_read_post_id int NULL COMMENT '最后已读家庭圈动态ID',
        last_read_chat_message_id int NULL COMMENT '最后已读家庭群聊消息ID',
        read_posts_at timestamp(6) NULL COMMENT '家庭圈阅读时间',
        read_chat_at timestamp(6) NULL COMMENT '家庭群聊阅读时间',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_family_read_states_user (user_id),
        KEY IDX_family_read_states_post (last_read_post_id),
        KEY IDX_family_read_states_chat (last_read_chat_message_id),
        CONSTRAINT FK_family_read_states_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS family_read_states');
  }
}
