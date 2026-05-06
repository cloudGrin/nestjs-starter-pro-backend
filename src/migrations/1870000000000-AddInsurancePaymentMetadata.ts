import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsurancePaymentMetadata1870000000000 implements MigrationInterface {
  name = 'AddInsurancePaymentMetadata1870000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE insurance_policies
        ADD COLUMN payment_frequency enum('monthly','quarterly','semi_annual','annual','single','other') NULL COMMENT '缴费周期' AFTER payment_amount,
        ADD COLUMN payment_channel varchar(100) NULL COMMENT '支付渠道' AFTER payment_frequency,
        ADD COLUMN purchase_channel varchar(100) NULL COMMENT '购买渠道' AFTER payment_channel,
        ADD COLUMN payment_reminder_enabled tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否开启续费提醒' AFTER purchase_channel
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE insurance_policies
        DROP COLUMN payment_reminder_enabled,
        DROP COLUMN purchase_channel,
        DROP COLUMN payment_channel,
        DROP COLUMN payment_frequency
    `);
  }
}
