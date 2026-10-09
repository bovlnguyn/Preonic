import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDirectPaymentAndFeeBillingV21791400000000 implements MigrationInterface {
  name = 'CreateDirectPaymentAndFeeBillingV21791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeePolicies', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeePolicies (
          FeePolicyId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeePolicies PRIMARY KEY DEFAULT NEWID(),
          Code NVARCHAR(50) NOT NULL,
          Name NVARCHAR(150) NOT NULL,
          BuyerFeeBps INT NOT NULL,
          SellerFeeBps INT NOT NULL,
          Currency CHAR(3) NOT NULL CONSTRAINT DF_PlatformFeePolicies_Currency DEFAULT 'VND',
          IsActive BIT NOT NULL CONSTRAINT DF_PlatformFeePolicies_IsActive DEFAULT 1,
          EffectiveFrom DATETIME2 NOT NULL,
          EffectiveTo DATETIME2 NULL,
          Notes NVARCHAR(500) NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeePolicies_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeePolicies_UpdatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT CK_PlatformFeePolicies_BuyerFeeBps CHECK (BuyerFeeBps BETWEEN 0 AND 10000),
          CONSTRAINT CK_PlatformFeePolicies_SellerFeeBps CHECK (SellerFeeBps BETWEEN 0 AND 10000),
          CONSTRAINT CK_PlatformFeePolicies_Window CHECK (EffectiveTo IS NULL OR EffectiveTo > EffectiveFrom)
        );

        CREATE UNIQUE INDEX UX_PlatformFeePolicies_Code
          ON dbo.PlatformFeePolicies(Code);
        CREATE INDEX IX_PlatformFeePolicies_ActiveWindow
          ON dbo.PlatformFeePolicies(IsActive, EffectiveFrom, EffectiveTo);
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.PlatformFeePolicies WHERE Code = 'PREONIC_LAUNCH_08')
      BEGIN
        INSERT INTO dbo.PlatformFeePolicies
          (FeePolicyId, Code, Name, BuyerFeeBps, SellerFeeBps, Currency, IsActive, EffectiveFrom, Notes)
        VALUES
          (NEWID(), 'PREONIC_LAUNCH_08', N'Preonic launch fee 0.8%', 50, 30, 'VND', 1,
           SYSUTCDATETIME(), N'Enterprise 0.5% + Farmer 0.3%; pay only after successful goods payment.');
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.UserSettlementBankAccounts', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.UserSettlementBankAccounts (
          BankAccountId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_UserSettlementBankAccounts PRIMARY KEY DEFAULT NEWID(),
          UserId UNIQUEIDENTIFIER NOT NULL,
          BankCode NVARCHAR(30) NOT NULL,
          BankName NVARCHAR(100) NULL,
          AccountHolder NVARCHAR(150) NOT NULL,
          AccountNumberCiphertext NVARCHAR(MAX) NOT NULL,
          AccountNumberIv NVARCHAR(64) NOT NULL,
          AccountNumberAuthTag NVARCHAR(64) NOT NULL,
          EncryptionKeyVersion SMALLINT NOT NULL
            CONSTRAINT DF_UserSettlementBankAccounts_KeyVersion DEFAULT 1,
          AccountNumberFingerprint CHAR(64) NOT NULL,
          MaskedAccountNumber NVARCHAR(40) NOT NULL,
          IsDefault BIT NOT NULL CONSTRAINT DF_UserSettlementBankAccounts_IsDefault DEFAULT 0,
          Status NVARCHAR(20) NOT NULL CONSTRAINT DF_UserSettlementBankAccounts_Status DEFAULT 'active',
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserSettlementBankAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_UserSettlementBankAccounts_UpdatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_UserSettlementBankAccounts_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT CK_UserSettlementBankAccounts_Status
            CHECK (Status IN ('active','disabled')),
          CONSTRAINT CK_UserSettlementBankAccounts_KeyVersion
            CHECK (EncryptionKeyVersion > 0)
        );

        CREATE INDEX IX_UserSettlementBankAccounts_User_Status
          ON dbo.UserSettlementBankAccounts(UserId, Status);
        CREATE UNIQUE INDEX UX_UserSettlementBankAccounts_User_Fingerprint
          ON dbo.UserSettlementBankAccounts(UserId, AccountNumberFingerprint);
        CREATE UNIQUE INDEX UX_UserSettlementBankAccounts_Default
          ON dbo.UserSettlementBankAccounts(UserId)
          WHERE IsDefault = 1;
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.DirectGoodsPayments', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.DirectGoodsPayments (
          GoodsPaymentId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_DirectGoodsPayments PRIMARY KEY DEFAULT NEWID(),
          ContractId UNIQUEIDENTIFIER NOT NULL,
          PayerUserId UNIQUEIDENTIFIER NOT NULL,
          PayeeUserId UNIQUEIDENTIFIER NOT NULL,
          BankAccountId UNIQUEIDENTIFIER NOT NULL,
          InstallmentSequence SMALLINT NOT NULL CONSTRAINT DF_DirectGoodsPayments_Sequence DEFAULT 1,
          Amount DECIMAL(18,2) NOT NULL,
          Currency CHAR(3) NOT NULL CONSTRAINT DF_DirectGoodsPayments_Currency DEFAULT 'VND',
          TransferContent NVARCHAR(100) NOT NULL,
          RecipientBankCode NVARCHAR(30) NOT NULL,
          RecipientAccountHolder NVARCHAR(150) NOT NULL,
          RecipientMaskedAccountNumber NVARCHAR(40) NOT NULL,
          Status NVARCHAR(30) NOT NULL CONSTRAINT DF_DirectGoodsPayments_Status DEFAULT 'planned',
          ConfirmationMethod NVARCHAR(30) NULL,
          IdempotencyKey NVARCHAR(128) NOT NULL,
          DueAt DATETIME2 NULL,
          ExpiresAt DATETIME2 NULL,
          ConfirmedAt DATETIME2 NULL,
          ConfirmedBy UNIQUEIDENTIFIER NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DirectGoodsPayments_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_DirectGoodsPayments_UpdatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_DirectGoodsPayments_Contracts
            FOREIGN KEY (ContractId) REFERENCES dbo.Contracts(ContractId),
          CONSTRAINT FK_DirectGoodsPayments_Payer
            FOREIGN KEY (PayerUserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT FK_DirectGoodsPayments_Payee
            FOREIGN KEY (PayeeUserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT FK_DirectGoodsPayments_BankAccount
            FOREIGN KEY (BankAccountId) REFERENCES dbo.UserSettlementBankAccounts(BankAccountId),
          CONSTRAINT FK_DirectGoodsPayments_ConfirmedBy
            FOREIGN KEY (ConfirmedBy) REFERENCES dbo.Users(UserId),

          CONSTRAINT CK_DirectGoodsPayments_Amount CHECK (Amount > 0),
          CONSTRAINT CK_DirectGoodsPayments_Sequence CHECK (InstallmentSequence > 0),
          CONSTRAINT CK_DirectGoodsPayments_Status CHECK (
            Status IN ('planned','payable','awaiting_payment','awaiting_confirmation',
                       'confirmed','expired','cancelled','disputed')
          ),
          CONSTRAINT CK_DirectGoodsPayments_ConfirmationMethod CHECK (
            ConfirmationMethod IS NULL OR
            ConfirmationMethod IN ('farmer_manual','provider_webhook','admin_review')
          )
        );

        CREATE UNIQUE INDEX UX_DirectGoodsPayments_Contract_Sequence
          ON dbo.DirectGoodsPayments(ContractId, InstallmentSequence);
        CREATE UNIQUE INDEX UX_DirectGoodsPayments_TransferContent
          ON dbo.DirectGoodsPayments(TransferContent);
        CREATE UNIQUE INDEX UX_DirectGoodsPayments_IdempotencyKey
          ON dbo.DirectGoodsPayments(IdempotencyKey);
        CREATE INDEX IX_DirectGoodsPayments_Payer_Status
          ON dbo.DirectGoodsPayments(PayerUserId, Status, CreatedAt);
        CREATE INDEX IX_DirectGoodsPayments_Payee_Status
          ON dbo.DirectGoodsPayments(PayeeUserId, Status, CreatedAt);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeeAccounts', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeeAccounts (
          FeeAccountId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeeAccounts PRIMARY KEY DEFAULT NEWID(),
          UserId UNIQUEIDENTIFIER NOT NULL,
          OutstandingAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PlatformFeeAccounts_Outstanding DEFAULT 0,
          OverdueAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_PlatformFeeAccounts_Overdue DEFAULT 0,
          Status NVARCHAR(30) NOT NULL CONSTRAINT DF_PlatformFeeAccounts_Status DEFAULT 'good_standing',
          RestrictedAt DATETIME2 NULL,
          LastCalculatedAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeeAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeeAccounts_UpdatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeeAccounts_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT CK_PlatformFeeAccounts_Amounts
            CHECK (OutstandingAmount >= 0 AND OverdueAmount >= 0),
          CONSTRAINT CK_PlatformFeeAccounts_Status
            CHECK (Status IN ('good_standing','due','overdue','restricted'))
        );

        CREATE UNIQUE INDEX UX_PlatformFeeAccounts_User
          ON dbo.PlatformFeeAccounts(UserId);
        CREATE INDEX IX_PlatformFeeAccounts_Status
          ON dbo.PlatformFeeAccounts(Status, UpdatedAt);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeeStatements', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeeStatements (
          FeeStatementId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeeStatements PRIMARY KEY DEFAULT NEWID(),
          StatementCode NVARCHAR(50) NOT NULL,
          UserId UNIQUEIDENTIFIER NOT NULL,
          PeriodStart DATE NOT NULL,
          PeriodEnd DATE NOT NULL,
          OpeningBalanceSnapshot DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_PlatformFeeStatements_OpeningBalance DEFAULT 0,
          CurrentPeriodCharges DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_PlatformFeeStatements_Charges DEFAULT 0,
          CurrentPeriodCredits DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_PlatformFeeStatements_Credits DEFAULT 0,
          AmountDueSnapshot DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_PlatformFeeStatements_Due DEFAULT 0,
          AmountPaid DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_PlatformFeeStatements_Paid DEFAULT 0,
          Status NVARCHAR(30) NOT NULL CONSTRAINT DF_PlatformFeeStatements_Status DEFAULT 'draft',
          IssuedAt DATETIME2 NULL,
          DueAt DATETIME2 NULL,
          PaidAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeeStatements_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeeStatements_UpdatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeeStatements_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT CK_PlatformFeeStatements_Period CHECK (PeriodEnd >= PeriodStart),
          CONSTRAINT CK_PlatformFeeStatements_Amounts CHECK (
            OpeningBalanceSnapshot >= 0 AND CurrentPeriodCharges >= 0 AND
            CurrentPeriodCredits >= 0 AND AmountDueSnapshot >= 0 AND AmountPaid >= 0
          ),
          CONSTRAINT CK_PlatformFeeStatements_Status CHECK (
            Status IN ('draft','open','partially_paid','paid','overdue','voided')
          )
        );

        CREATE UNIQUE INDEX UX_PlatformFeeStatements_Code
          ON dbo.PlatformFeeStatements(StatementCode);
        CREATE UNIQUE INDEX UX_PlatformFeeStatements_User_Period
          ON dbo.PlatformFeeStatements(UserId, PeriodStart, PeriodEnd);
        CREATE INDEX IX_PlatformFeeStatements_User_Status_DueAt
          ON dbo.PlatformFeeStatements(UserId, Status, DueAt);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeeLedgerEntries', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeeLedgerEntries (
          FeeLedgerEntryId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeeLedgerEntries PRIMARY KEY DEFAULT NEWID(),
          UserId UNIQUEIDENTIFIER NOT NULL,
          ContractId UNIQUEIDENTIFIER NULL,
          GoodsPaymentId UNIQUEIDENTIFIER NULL,
          FeePolicyId UNIQUEIDENTIFIER NULL,
          FeeStatementId UNIQUEIDENTIFIER NULL,
          EntryType NVARCHAR(40) NOT NULL,
          Direction NVARCHAR(10) NOT NULL,
          Amount DECIMAL(18,2) NOT NULL,
          FeeRateBps INT NULL,
          Status NVARCHAR(20) NOT NULL CONSTRAINT DF_PlatformFeeLedgerEntries_Status DEFAULT 'pending',
          IdempotencyKey NVARCHAR(160) NOT NULL,
          Description NVARCHAR(500) NULL,
          PostedAt DATETIME2 NULL,
          VoidedAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeeLedgerEntries_CreatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeeLedgerEntries_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT FK_PlatformFeeLedgerEntries_Contracts
            FOREIGN KEY (ContractId) REFERENCES dbo.Contracts(ContractId),
          CONSTRAINT FK_PlatformFeeLedgerEntries_GoodsPayments
            FOREIGN KEY (GoodsPaymentId) REFERENCES dbo.DirectGoodsPayments(GoodsPaymentId),
          CONSTRAINT FK_PlatformFeeLedgerEntries_FeePolicies
            FOREIGN KEY (FeePolicyId) REFERENCES dbo.PlatformFeePolicies(FeePolicyId),
          CONSTRAINT FK_PlatformFeeLedgerEntries_Statements
            FOREIGN KEY (FeeStatementId) REFERENCES dbo.PlatformFeeStatements(FeeStatementId),

          CONSTRAINT CK_PlatformFeeLedgerEntries_Amount CHECK (Amount > 0),
          CONSTRAINT CK_PlatformFeeLedgerEntries_FeeRate CHECK (
            FeeRateBps IS NULL OR FeeRateBps BETWEEN 0 AND 10000
          ),
          CONSTRAINT CK_PlatformFeeLedgerEntries_Type CHECK (
            EntryType IN ('buyer_transaction_fee','seller_transaction_fee','payment',
                          'discount','waiver','adjustment','refund')
          ),
          CONSTRAINT CK_PlatformFeeLedgerEntries_Direction CHECK (Direction IN ('debit','credit')),
          CONSTRAINT CK_PlatformFeeLedgerEntries_Status CHECK (Status IN ('pending','posted','voided'))
        );

        CREATE UNIQUE INDEX UX_PlatformFeeLedgerEntries_IdempotencyKey
          ON dbo.PlatformFeeLedgerEntries(IdempotencyKey);
        CREATE INDEX IX_PlatformFeeLedgerEntries_User_Status_CreatedAt
          ON dbo.PlatformFeeLedgerEntries(UserId, Status, CreatedAt);
        CREATE INDEX IX_PlatformFeeLedgerEntries_Statement
          ON dbo.PlatformFeeLedgerEntries(FeeStatementId);
        CREATE INDEX IX_PlatformFeeLedgerEntries_Contract
          ON dbo.PlatformFeeLedgerEntries(ContractId);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeePayments', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeePayments (
          FeePaymentId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeePayments PRIMARY KEY DEFAULT NEWID(),
          UserId UNIQUEIDENTIFIER NOT NULL,
          FeeStatementId UNIQUEIDENTIFIER NULL,
          OrderCode NVARCHAR(50) NOT NULL,
          IdempotencyKey NVARCHAR(128) NOT NULL,
          Amount DECIMAL(18,2) NOT NULL,
          Currency CHAR(3) NOT NULL CONSTRAINT DF_PlatformFeePayments_Currency DEFAULT 'VND',
          Provider NVARCHAR(30) NOT NULL,
          ProviderPaymentId NVARCHAR(150) NULL,
          TransferContent NVARCHAR(100) NOT NULL,
          PaymentUrl NVARCHAR(1000) NULL,
          QrPayload NVARCHAR(2000) NULL,
          Status NVARCHAR(20) NOT NULL CONSTRAINT DF_PlatformFeePayments_Status DEFAULT 'pending',
          ExpiresAt DATETIME2 NULL,
          PaidAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeePayments_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeePayments_UpdatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeePayments_Users
            FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
          CONSTRAINT FK_PlatformFeePayments_Statements
            FOREIGN KEY (FeeStatementId) REFERENCES dbo.PlatformFeeStatements(FeeStatementId),
          CONSTRAINT CK_PlatformFeePayments_Amount CHECK (Amount > 0),
          CONSTRAINT CK_PlatformFeePayments_Status CHECK (
            Status IN ('pending','processing','paid','failed','expired','cancelled')
          )
        );

        CREATE UNIQUE INDEX UX_PlatformFeePayments_OrderCode
          ON dbo.PlatformFeePayments(OrderCode);
        CREATE UNIQUE INDEX UX_PlatformFeePayments_IdempotencyKey
          ON dbo.PlatformFeePayments(IdempotencyKey);
        CREATE UNIQUE INDEX UX_PlatformFeePayments_ProviderPayment
          ON dbo.PlatformFeePayments(Provider, ProviderPaymentId)
          WHERE ProviderPaymentId IS NOT NULL;
        CREATE UNIQUE INDEX UX_PlatformFeePayments_TransferContent
          ON dbo.PlatformFeePayments(TransferContent);
        CREATE INDEX IX_PlatformFeePayments_User_Status
          ON dbo.PlatformFeePayments(UserId, Status, CreatedAt);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.PlatformFeePaymentEvents', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.PlatformFeePaymentEvents (
          FeePaymentEventId UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_PlatformFeePaymentEvents PRIMARY KEY DEFAULT NEWID(),
          FeePaymentId UNIQUEIDENTIFIER NOT NULL,
          Provider NVARCHAR(30) NOT NULL,
          ProviderEventId NVARCHAR(150) NULL,
          EventType NVARCHAR(60) NOT NULL,
          PayloadHash CHAR(64) NOT NULL,
          SanitizedPayload NVARCHAR(MAX) NULL,
          OccurredAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PlatformFeePaymentEvents_CreatedAt DEFAULT SYSUTCDATETIME(),

          CONSTRAINT FK_PlatformFeePaymentEvents_Payments
            FOREIGN KEY (FeePaymentId) REFERENCES dbo.PlatformFeePayments(FeePaymentId)
        );

        CREATE UNIQUE INDEX UX_PlatformFeePaymentEvents_ProviderEvent
          ON dbo.PlatformFeePaymentEvents(Provider, ProviderEventId)
          WHERE ProviderEventId IS NOT NULL;
        CREATE INDEX IX_PlatformFeePaymentEvents_Payment_CreatedAt
          ON dbo.PlatformFeePaymentEvents(FeePaymentId, CreatedAt);
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop only tables introduced by this migration. Legacy escrow/wallet tables are untouched.
    const tables = [
      'PlatformFeePaymentEvents',
      'PlatformFeePayments',
      'PlatformFeeLedgerEntries',
      'PlatformFeeStatements',
      'PlatformFeeAccounts',
      'DirectGoodsPayments',
      'UserSettlementBankAccounts',
      'PlatformFeePolicies',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        IF OBJECT_ID('dbo.${table}', 'U') IS NOT NULL
          DROP TABLE dbo.${table};
      `);
    }
  }
}
