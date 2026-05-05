import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFamilyCommentReplies1850000000000 implements MigrationInterface {
  name = 'AddFamilyCommentReplies1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE family_post_comments
        ADD COLUMN parent_comment_id int NULL COMMENT '父评论ID' AFTER author_id,
        ADD COLUMN reply_to_user_id int NULL COMMENT '回复目标用户ID' AFTER parent_comment_id,
        ADD KEY IDX_family_post_comments_parent (parent_comment_id),
        ADD KEY IDX_family_post_comments_reply_to_user (reply_to_user_id),
        ADD CONSTRAINT FK_family_post_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES family_post_comments(id) ON DELETE CASCADE,
        ADD CONSTRAINT FK_family_post_comments_reply_to_user FOREIGN KEY (reply_to_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE family_post_comments
        DROP FOREIGN KEY FK_family_post_comments_reply_to_user,
        DROP FOREIGN KEY FK_family_post_comments_parent,
        DROP KEY IDX_family_post_comments_reply_to_user,
        DROP KEY IDX_family_post_comments_parent,
        DROP COLUMN reply_to_user_id,
        DROP COLUMN parent_comment_id
    `);
  }
}
