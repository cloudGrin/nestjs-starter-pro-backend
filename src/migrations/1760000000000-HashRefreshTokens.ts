import { MigrationInterface, QueryRunner } from 'typeorm';

export class HashRefreshTokens1760000000000 implements MigrationInterface {
  name = 'HashRefreshTokens1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN token_hash varchar(64) NULL COMMENT '刷新Token SHA-256哈希'
    `);
    await queryRunner.query(`
      UPDATE refresh_tokens
      SET token_hash = SHA2(token, 256)
      WHERE token_hash IS NULL
    `);
    await queryRunner.query(
      'ALTER TABLE refresh_tokens DROP INDEX IDX_refresh_tokens_token_userId',
    );
    await queryRunner.query('ALTER TABLE refresh_tokens DROP INDEX UQ_refresh_tokens_token');
    await queryRunner.query('ALTER TABLE refresh_tokens DROP COLUMN token');
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      MODIFY token_hash varchar(64) NOT NULL COMMENT '刷新Token SHA-256哈希'
    `);
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD UNIQUE KEY UQ_refresh_tokens_token_hash (token_hash)
    `);
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD KEY IDX_refresh_tokens_tokenHash_userId (token_hash, userId)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN token varchar(500) NULL COMMENT '刷新Token'
    `);
    await queryRunner.query(`
      UPDATE refresh_tokens
      SET token = token_hash
      WHERE token IS NULL
    `);
    await queryRunner.query(
      'ALTER TABLE refresh_tokens DROP INDEX IDX_refresh_tokens_tokenHash_userId',
    );
    await queryRunner.query('ALTER TABLE refresh_tokens DROP INDEX UQ_refresh_tokens_token_hash');
    await queryRunner.query('ALTER TABLE refresh_tokens DROP COLUMN token_hash');
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      MODIFY token varchar(500) NOT NULL COMMENT '刷新Token'
    `);
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD UNIQUE KEY UQ_refresh_tokens_token (token)
    `);
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD KEY IDX_refresh_tokens_token_userId (token, userId)
    `);
  }
}
