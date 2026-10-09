import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendDirectPaymentV2Phase21791410000000 implements MigrationInterface {
  name = 'ExtendDirectPaymentV2Phase21791410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      IF OBJECT_ID('dbo.ContractFeeTerms', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.ContractFeeTerms (
          ContractFeeTermsId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_ContractFeeTerms PRIMARY KEY DEFAULT NEWID(),
          ContractId UNIQUEIDENTIFIER NOT NULL,
          FeePolicyId UNIQUEIDENTIFIER NOT NULL,
          BuyerFeeBps INT NOT NULL,
          SellerFeeBps INT NOT NULL,
          Currency CHAR(3) NOT NULL CONSTRAINT DF_ContractFeeTerms_Currency DEFAULT 'VND',
          SnapshottedAt DATETIME2 NOT NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ContractFeeTerms_CreatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_ContractFeeTerms_Contracts
            FOREIGN KEY (ContractId) REFERENCES dbo.Contracts(ContractId),
          CONSTRAINT FK_ContractFeeTerms_Policies
            FOREIGN KEY (FeePolicyId) REFERENCES dbo.PlatformFeePolicies(FeePolicyId),
          CONSTRAINT CK_ContractFeeTerms_BuyerFeeBps CHECK (BuyerFeeBps BETWEEN 0 AND 10000),
          CONSTRAINT CK_ContractFeeTerms_SellerFeeBps CHECK (SellerFeeBps BETWEEN 0 AND 10000),
          CONSTRAINT CK_ContractFeeTerms_TotalFee CHECK (BuyerFeeBps + SellerFeeBps < 10000)
        );

        CREATE UNIQUE INDEX UX_ContractFeeTerms_Contract
          ON dbo.ContractFeeTerms(ContractId);
        CREATE INDEX IX_ContractFeeTerms_Policy
          ON dbo.ContractFeeTerms(FeePolicyId);
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.DirectGoodsPayments', 'Trigger') IS NULL
      BEGIN
        ALTER TABLE dbo.DirectGoodsPayments
          ADD Trigger NVARCHAR(30) NULL;

        UPDATE dbo.DirectGoodsPayments
          SET Trigger = 'manual'
          WHERE Trigger IS NULL;

        ALTER TABLE dbo.DirectGoodsPayments
          ALTER COLUMN Trigger NVARCHAR(30) NOT NULL;

        ALTER TABLE dbo.DirectGoodsPayments
          ADD CONSTRAINT CK_DirectGoodsPayments_Trigger
          CHECK (Trigger IN ('contract_active','goods_accepted','manual'));
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_PlatformFeeLedgerEntries_GoodsPayment'
          AND object_id = OBJECT_ID('dbo.PlatformFeeLedgerEntries')
      )
      BEGIN
        CREATE INDEX IX_PlatformFeeLedgerEntries_GoodsPayment
          ON dbo.PlatformFeeLedgerEntries(GoodsPaymentId, Status);
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      IF OBJECT_ID('dbo.ContractFeeTerms', 'U') IS NOT NULL
        DROP TABLE dbo.ContractFeeTerms;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_PlatformFeeLedgerEntries_GoodsPayment'
          AND object_id = OBJECT_ID('dbo.PlatformFeeLedgerEntries')
      )
      DROP INDEX IX_PlatformFeeLedgerEntries_GoodsPayment
        ON dbo.PlatformFeeLedgerEntries;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_DirectGoodsPayments_Trigger'
      )
      ALTER TABLE dbo.DirectGoodsPayments
        DROP CONSTRAINT CK_DirectGoodsPayments_Trigger;
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.DirectGoodsPayments', 'Trigger') IS NOT NULL
        ALTER TABLE dbo.DirectGoodsPayments DROP COLUMN Trigger;
    `);
  }
}
