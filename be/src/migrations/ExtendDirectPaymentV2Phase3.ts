import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDirectPaymentV2Phase31791420000000 implements MigrationInterface {
  name = 'ExtendDirectPaymentV2Phase31791420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeePaymentApplications', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeePaymentApplications (
          FeePaymentApplicationId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeePaymentApplications PRIMARY KEY DEFAULT NEWID(),
          FeePaymentId UNIQUEIDENTIFIER NOT NULL,
          FeeLedgerEntryId UNIQUEIDENTIFIER NOT NULL,
          FeeStatementId UNIQUEIDENTIFIER NULL,
          Amount DECIMAL(18,2) NOT NULL,
          CreatedAt DATETIME2 NOT NULL
            CONSTRAINT DF_PlatformFeePaymentApplications_CreatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeePaymentApplications_Payment
            FOREIGN KEY (FeePaymentId) REFERENCES dbo.PlatformFeePayments(FeePaymentId),
          CONSTRAINT FK_PlatformFeePaymentApplications_Ledger
            FOREIGN KEY (FeeLedgerEntryId) REFERENCES dbo.PlatformFeeLedgerEntries(FeeLedgerEntryId),
          CONSTRAINT FK_PlatformFeePaymentApplications_Statement
            FOREIGN KEY (FeeStatementId) REFERENCES dbo.PlatformFeeStatements(FeeStatementId),
          CONSTRAINT CK_PlatformFeePaymentApplications_Amount CHECK (Amount > 0)
        );

        CREATE UNIQUE INDEX UX_PlatformFeePaymentApplications_Payment_Ledger
          ON dbo.PlatformFeePaymentApplications(FeePaymentId, FeeLedgerEntryId);
        CREATE INDEX IX_PlatformFeePaymentApplications_Ledger
          ON dbo.PlatformFeePaymentApplications(FeeLedgerEntryId);
        CREATE INDEX IX_PlatformFeePaymentApplications_Statement
          ON dbo.PlatformFeePaymentApplications(FeeStatementId);
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_PlatformFeePayments_Status'
      )
      BEGIN
        ALTER TABLE dbo.PlatformFeePayments
          DROP CONSTRAINT CK_PlatformFeePayments_Status;
      END

      ALTER TABLE dbo.PlatformFeePayments
        ADD CONSTRAINT CK_PlatformFeePayments_Status CHECK (
          Status IN (
            'pending','processing','paid','failed',
            'expired','cancelled','amount_mismatch'
          )
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_PlatformFeePayments_Status'
      )
      BEGIN
        ALTER TABLE dbo.PlatformFeePayments
          DROP CONSTRAINT CK_PlatformFeePayments_Status;
      END

      ALTER TABLE dbo.PlatformFeePayments
        ADD CONSTRAINT CK_PlatformFeePayments_Status CHECK (
          Status IN ('pending','processing','paid','failed','expired','cancelled')
        );
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeePaymentApplications', 'U') IS NOT NULL
        DROP TABLE dbo.PlatformFeePaymentApplications;
    `);
  }
}
