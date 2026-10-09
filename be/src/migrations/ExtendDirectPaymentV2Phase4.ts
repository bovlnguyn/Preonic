import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDirectPaymentV2Phase41791430000000 implements MigrationInterface {
  name = 'ExtendDirectPaymentV2Phase41791430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Disputes', 'EscrowId') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Disputes
          ALTER COLUMN EscrowId UNIQUEIDENTIFIER NULL;
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'PaymentFlow') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
          ADD PaymentFlow NVARCHAR(20) NOT NULL
          CONSTRAINT DF_Contracts_PaymentFlow DEFAULT 'escrow_v1';

        ALTER TABLE dbo.Contracts
          ADD CONSTRAINT CK_Contracts_PaymentFlow
          CHECK (PaymentFlow IN ('escrow_v1','direct_v2'));

        CREATE INDEX IX_Contracts_PaymentFlow_Status
          ON dbo.Contracts(PaymentFlow, Status);
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM dbo.Disputes WHERE EscrowId IS NULL)
        THROW 51000, 'Cannot rollback Phase4 while Direct V2 disputes with NULL EscrowId exist.', 1;

      IF COL_LENGTH('dbo.Disputes', 'EscrowId') IS NOT NULL
        ALTER TABLE dbo.Disputes
          ALTER COLUMN EscrowId UNIQUEIDENTIFIER NOT NULL;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'IX_Contracts_PaymentFlow_Status'
          AND object_id = OBJECT_ID('dbo.Contracts')
      )
      DROP INDEX IX_Contracts_PaymentFlow_Status ON dbo.Contracts;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_Contracts_PaymentFlow'
      )
      ALTER TABLE dbo.Contracts DROP CONSTRAINT CK_Contracts_PaymentFlow;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.default_constraints dc
        JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.Contracts')
          AND c.name = 'PaymentFlow'
      )
      BEGIN
        DECLARE @df sysname;
        SELECT @df = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.Contracts')
          AND c.name = 'PaymentFlow';
        EXEC('ALTER TABLE dbo.Contracts DROP CONSTRAINT [' + @df + ']');
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'PaymentFlow') IS NOT NULL
        ALTER TABLE dbo.Contracts DROP COLUMN PaymentFlow;
    `);
  }
}
