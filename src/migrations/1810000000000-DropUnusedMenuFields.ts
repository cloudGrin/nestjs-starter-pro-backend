import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUnusedMenuFields1810000000000 implements MigrationInterface {
  name = 'DropUnusedMenuFields1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE menus DROP COLUMN isCache');
    await queryRunner.query('ALTER TABLE menus DROP COLUMN meta');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE menus ADD meta json NULL COMMENT '路由元数据' AFTER isExternal",
    );
    await queryRunner.query(
      "ALTER TABLE menus ADD isCache tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否缓存页面' AFTER isExternal",
    );
  }
}
