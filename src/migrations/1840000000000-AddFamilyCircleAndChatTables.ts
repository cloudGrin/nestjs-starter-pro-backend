import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyCircleAndChatTables1840000000000 implements MigrationInterface {
  name = 'AddFamilyCircleAndChatTables1840000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE family_posts (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        content text NULL COMMENT '动态文字内容',
        author_id int NOT NULL COMMENT '发布者ID',
        PRIMARY KEY (id),
        KEY IDX_family_posts_author_created (author_id, createdAt),
        CONSTRAINT FK_family_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE family_post_media (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        post_id int NOT NULL COMMENT '动态ID',
        file_id int NOT NULL COMMENT '文件ID',
        media_type enum('image','video') NOT NULL COMMENT '媒体类型',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_family_post_media_post_file (post_id, file_id),
        KEY IDX_family_post_media_file (file_id),
        CONSTRAINT FK_family_post_media_post FOREIGN KEY (post_id) REFERENCES family_posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_family_post_media_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE family_post_comments (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        post_id int NOT NULL COMMENT '动态ID',
        author_id int NOT NULL COMMENT '评论者ID',
        content text NOT NULL COMMENT '评论内容',
        PRIMARY KEY (id),
        KEY IDX_family_post_comments_post_created (post_id, createdAt),
        KEY IDX_family_post_comments_author (author_id),
        CONSTRAINT FK_family_post_comments_post FOREIGN KEY (post_id) REFERENCES family_posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_family_post_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE family_post_likes (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        post_id int NOT NULL COMMENT '动态ID',
        user_id int NOT NULL COMMENT '点赞用户ID',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_family_post_likes_post_user (post_id, user_id),
        KEY IDX_family_post_likes_user (user_id),
        CONSTRAINT FK_family_post_likes_post FOREIGN KEY (post_id) REFERENCES family_posts(id) ON DELETE CASCADE,
        CONSTRAINT FK_family_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE family_chat_messages (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        content text NULL COMMENT '消息文字内容',
        sender_id int NOT NULL COMMENT '发送者ID',
        PRIMARY KEY (id),
        KEY IDX_family_chat_messages_sender_created (sender_id, createdAt),
        CONSTRAINT FK_family_chat_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE family_chat_message_media (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        message_id int NOT NULL COMMENT '聊天消息ID',
        file_id int NOT NULL COMMENT '文件ID',
        media_type enum('image','video') NOT NULL COMMENT '媒体类型',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        PRIMARY KEY (id),
        UNIQUE KEY UQ_family_chat_message_media_message_file (message_id, file_id),
        KEY IDX_family_chat_message_media_file (file_id),
        CONSTRAINT FK_family_chat_message_media_message FOREIGN KEY (message_id) REFERENCES family_chat_messages(id) ON DELETE CASCADE,
        CONSTRAINT FK_family_chat_message_media_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS family_chat_message_media');
    await queryRunner.query('DROP TABLE IF EXISTS family_chat_messages');
    await queryRunner.query('DROP TABLE IF EXISTS family_post_likes');
    await queryRunner.query('DROP TABLE IF EXISTS family_post_comments');
    await queryRunner.query('DROP TABLE IF EXISTS family_post_media');
    await queryRunner.query('DROP TABLE IF EXISTS family_posts');
  }
}
