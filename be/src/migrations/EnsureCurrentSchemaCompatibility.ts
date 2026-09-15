import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Guard migration for databases created from the original preonic.sql baseline.
 *
 * The current entities/services use a number of Contract fields and enum values that
 * were historically present on the shared development database but are not created
 * by the checked-in baseline + older migrations.  Without these guards, a fresh
 * local database can fail before later migrations are reached (for example the
 * escrow backfills reference Contracts.EscrowStatus/PaidAmount/RemainingAmount).
 *
 * Every change is idempotent so this migration is safe on the shared DB where some
 * or all of these objects may already exist.
 */
export class EnsureCurrentSchemaCompatibility1785590000000 implements MigrationInterface {
  name = 'EnsureCurrentSchemaCompatibility1785590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceEnabled') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuranceEnabled BIT NOT NULL
          CONSTRAINT DF_Contracts_InsuranceEnabled DEFAULT 0 WITH VALUES;
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceProvider') IS NULL
        ALTER TABLE dbo.Contracts ADD InsuranceProvider NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.Contracts', 'InsurancePackage') IS NULL
        ALTER TABLE dbo.Contracts ADD InsurancePackage NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.Contracts', 'InsuranceFee') IS NULL
        ALTER TABLE dbo.Contracts ADD InsuranceFee DECIMAL(18,2) NULL;
      IF COL_LENGTH('dbo.Contracts', 'InsuranceStatus') IS NULL
        ALTER TABLE dbo.Contracts ADD InsuranceStatus NVARCHAR(30) NULL;
      IF COL_LENGTH('dbo.Contracts', 'EscrowStatus') IS NULL
        ALTER TABLE dbo.Contracts ADD EscrowStatus NVARCHAR(30) NULL;
      IF COL_LENGTH('dbo.Contracts', 'PaidAmount') IS NULL
        ALTER TABLE dbo.Contracts ADD PaidAmount DECIMAL(18,2) NULL
          CONSTRAINT DF_Contracts_PaidAmount DEFAULT 0;
      IF COL_LENGTH('dbo.Contracts', 'RemainingAmount') IS NULL
        ALTER TABLE dbo.Contracts ADD RemainingAmount DECIMAL(18,2) NULL;
      IF COL_LENGTH('dbo.Contracts', 'DeliveryStatus') IS NULL
        ALTER TABLE dbo.Contracts ADD DeliveryStatus NVARCHAR(30) NULL;
      IF COL_LENGTH('dbo.Contracts', 'DeliveredAt') IS NULL
        ALTER TABLE dbo.Contracts ADD DeliveredAt DATETIME2 NULL;
      IF COL_LENGTH('dbo.Contracts', 'DeliveryNote') IS NULL
        ALTER TABLE dbo.Contracts ADD DeliveryNote NVARCHAR(500) NULL;
      IF COL_LENGTH('dbo.Contracts', 'CreatedBy') IS NULL
        ALTER TABLE dbo.Contracts ADD CreatedBy UNIQUEIDENTIFIER NULL;
    `);

    // Current API supports custom payment terms.
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_Contracts_PaymentTerms'
          AND parent_object_id = OBJECT_ID('dbo.Contracts')
      )
        ALTER TABLE dbo.Contracts DROP CONSTRAINT CK_Contracts_PaymentTerms;

      ALTER TABLE dbo.Contracts WITH CHECK
      ADD CONSTRAINT CK_Contracts_PaymentTerms
      CHECK (PaymentTerms IN ('50_50','30_70','100_delivery','100_upfront','custom'));
    `);

    // Align the database-side default with Contract.entity.ts.  The application
    // explicitly supplies status today, but keeping the default consistent avoids
    // surprising rows from scripts/imports.
    await queryRunner.query(`
      DECLARE @ContractStatusDefault sysname;
      SELECT @ContractStatusDefault = dc.name
      FROM sys.default_constraints dc
      INNER JOIN sys.columns c
        ON c.object_id = dc.parent_object_id
       AND c.column_id = dc.parent_column_id
      WHERE dc.parent_object_id = OBJECT_ID('dbo.Contracts')
        AND c.name = 'Status';

      IF @ContractStatusDefault IS NOT NULL
        EXEC('ALTER TABLE dbo.Contracts DROP CONSTRAINT [' + @ContractStatusDefault + ']');

      IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.object_id = dc.parent_object_id
         AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.Contracts')
          AND c.name = 'Status'
      )
        ALTER TABLE dbo.Contracts
        ADD CONSTRAINT DF_Contracts_Status DEFAULT 'draft' FOR Status;
    `);

    // Withdrawal workflow introduced values that the original SQL CHECK constraints
    // do not allow yet.
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_PayTx_Type'
          AND parent_object_id = OBJECT_ID('dbo.PaymentTransactions')
      )
        ALTER TABLE dbo.PaymentTransactions DROP CONSTRAINT CK_PayTx_Type;

      ALTER TABLE dbo.PaymentTransactions WITH CHECK
      ADD CONSTRAINT CK_PayTx_Type
      CHECK (Type IN ('topup','demo_topup','escrow_deposit','escrow_release','refund','commission','withdraw'));
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_PayTx_Status'
          AND parent_object_id = OBJECT_ID('dbo.PaymentTransactions')
      )
        ALTER TABLE dbo.PaymentTransactions DROP CONSTRAINT CK_PayTx_Status;

      ALTER TABLE dbo.PaymentTransactions WITH CHECK
      ADD CONSTRAINT CK_PayTx_Status
      CHECK (Status IN ('pending','completed','failed','cancelled','rejected'));
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_PayTx_Method'
          AND parent_object_id = OBJECT_ID('dbo.PaymentTransactions')
      )
        ALTER TABLE dbo.PaymentTransactions DROP CONSTRAINT CK_PayTx_Method;

      ALTER TABLE dbo.PaymentTransactions WITH CHECK
      ADD CONSTRAINT CK_PayTx_Method
      CHECK (PaymentMethod IN ('payos','sepay','internal','demo','bank_transfer'));
    `);


    // Weather service stores 'warning' / 'critical'. Keep the historical severities
    // too so existing rows from the old schema remain valid.
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_WA_Severity'
          AND parent_object_id = OBJECT_ID('dbo.WeatherAlerts')
      )
        ALTER TABLE dbo.WeatherAlerts DROP CONSTRAINT CK_WA_Severity;

      ALTER TABLE dbo.WeatherAlerts WITH CHECK
      ADD CONSTRAINT CK_WA_Severity
      CHECK (Severity IN ('low','medium','high','warning','critical'));
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally non-destructive. Some shared databases already had these legacy
    // compatibility columns/values before this migration existed; dropping them on
    // revert could destroy valid production/development data.
  }
}
