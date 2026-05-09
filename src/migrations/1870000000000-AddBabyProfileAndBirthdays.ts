import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBabyProfileAndBirthdays1870000000000 implements MigrationInterface {
  name = 'AddBabyProfileAndBirthdays1870000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE baby_profiles (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        nickname varchar(100) NOT NULL COMMENT '宝宝昵称',
        birth_date date NOT NULL COMMENT '出生日期',
        birth_time time NULL COMMENT '出生时间',
        avatar_file_id int NULL COMMENT '头像文件ID',
        birth_height_cm decimal(5,1) NULL COMMENT '出生身高cm',
        birth_weight_kg decimal(5,2) NULL COMMENT '出生体重kg',
        PRIMARY KEY (id),
        KEY IDX_baby_profiles_avatar_file (avatar_file_id),
        CONSTRAINT FK_baby_profiles_avatar_file FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE baby_growth_records (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        measured_at date NOT NULL COMMENT '测量日期',
        height_cm decimal(5,1) NULL COMMENT '身高cm',
        weight_kg decimal(5,2) NULL COMMENT '体重kg',
        remark varchar(500) NULL COMMENT '备注',
        PRIMARY KEY (id),
        KEY IDX_baby_growth_records_measured_at (measured_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE baby_birthdays (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        year int NOT NULL COMMENT '生日年份',
        title varchar(100) NOT NULL COMMENT '生日标题',
        description text NULL COMMENT '生日描述',
        cover_file_id int NULL COMMENT '封面文件ID',
        active_year int
          GENERATED ALWAYS AS (
            CASE WHEN deletedAt IS NULL THEN year ELSE NULL END
          ) STORED,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_baby_birthdays_active_year (active_year),
        KEY IDX_baby_birthdays_year (year),
        KEY IDX_baby_birthdays_cover_file (cover_file_id),
        CONSTRAINT FK_baby_birthdays_cover_file FOREIGN KEY (cover_file_id) REFERENCES files(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE baby_birthday_contributions (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        birthday_id int NOT NULL COMMENT '生日合辑ID',
        author_id int NOT NULL COMMENT '祝福人ID',
        content text NULL COMMENT '祝福内容',
        PRIMARY KEY (id),
        KEY IDX_baby_birthday_contributions_birthday_created (birthday_id, createdAt),
        KEY IDX_baby_birthday_contributions_author (author_id),
        CONSTRAINT FK_baby_birthday_contributions_birthday FOREIGN KEY (birthday_id) REFERENCES baby_birthdays(id) ON DELETE CASCADE,
        CONSTRAINT FK_baby_birthday_contributions_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE baby_birthday_media (
        id int NOT NULL AUTO_INCREMENT,
        createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        deletedAt timestamp(6) NULL COMMENT '删除时间',
        birthday_id int NOT NULL COMMENT '生日合辑ID',
        contribution_id int NULL COMMENT '祝福ID',
        file_id int NOT NULL COMMENT '文件ID',
        uploader_id int NOT NULL COMMENT '上传者ID',
        sort int NOT NULL DEFAULT 0 COMMENT '排序值',
        PRIMARY KEY (id),
        KEY IDX_baby_birthday_media_birthday_sort (birthday_id, sort),
        KEY IDX_baby_birthday_media_contribution (contribution_id),
        KEY IDX_baby_birthday_media_file (file_id),
        KEY IDX_baby_birthday_media_uploader (uploader_id),
        CONSTRAINT FK_baby_birthday_media_birthday FOREIGN KEY (birthday_id) REFERENCES baby_birthdays(id) ON DELETE CASCADE,
        CONSTRAINT FK_baby_birthday_media_contribution FOREIGN KEY (contribution_id) REFERENCES baby_birthday_contributions(id) ON DELETE CASCADE,
        CONSTRAINT FK_baby_birthday_media_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE RESTRICT,
        CONSTRAINT FK_baby_birthday_media_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS baby_birthday_media');
    await queryRunner.query('DROP TABLE IF EXISTS baby_birthday_contributions');
    await queryRunner.query('DROP TABLE IF EXISTS baby_birthdays');
    await queryRunner.query('DROP TABLE IF EXISTS baby_growth_records');
    await queryRunner.query('DROP TABLE IF EXISTS baby_profiles');
  }
}
