import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 添加用户最后登录时间字段
 * 用于准确统计活跃用户数
 */
export class AddUserLastLoginAt1730350962000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查字段是否已存在
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.findColumnByName('last_login_at');

    if (!hasColumn) {
      // 字段不存在，添加字段
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'last_login_at',
          type: 'timestamp',
          isNullable: true,
          comment: '最后登录时间',
        }),
      );
    }

    // 为现有用户设置默认值为创建时间
    await queryRunner.query(`
      UPDATE users
      SET last_login_at = createdAt
      WHERE last_login_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 检查字段是否存在
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.findColumnByName('last_login_at');

    if (hasColumn) {
      await queryRunner.dropColumn('users', 'last_login_at');
    }
  }
}
