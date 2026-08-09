import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawalReviewFieldsToPaymentTransactions1739000000000 implements MigrationInterface {
  name = 'AddWithdrawalReviewFieldsToPaymentTransactions1739000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankName') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD BankName NVARCHAR(100) NULL
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankAccountNumber') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD BankAccountNumber NVARCHAR(50) NULL
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankAccountHolder') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD BankAccountHolder NVARCHAR(150) NULL
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'RejectReason') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD RejectReason NVARCHAR(500) NULL
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'ProcessedBy') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD ProcessedBy UNIQUEIDENTIFIER NULL
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'ProcessedAt') IS NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        ADD ProcessedAt DATETIME2 NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'ProcessedAt') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN ProcessedAt
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'ProcessedBy') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN ProcessedBy
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'RejectReason') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN RejectReason
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankAccountHolder') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN BankAccountHolder
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankAccountNumber') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN BankAccountNumber
      END
    `);
    await queryRunner.query(`
      IF COL_LENGTH('dbo.PaymentTransactions', 'BankName') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.PaymentTransactions
        DROP COLUMN BankName
      END
    `);
  }
}
