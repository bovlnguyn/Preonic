import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdvertisementCampaigns1793642400000 implements MigrationInterface {
  name = 'CreateAdvertisementCampaigns1793642400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.CK_PlatformFeeLedgerEntries_Type', 'C') IS NOT NULL
        ALTER TABLE dbo.PlatformFeeLedgerEntries DROP CONSTRAINT CK_PlatformFeeLedgerEntries_Type;
      ALTER TABLE dbo.PlatformFeeLedgerEntries ADD CONSTRAINT CK_PlatformFeeLedgerEntries_Type CHECK (
        EntryType IN ('buyer_transaction_fee','seller_transaction_fee','advertising_fee','payment','discount','waiver','adjustment','refund')
      );
    `);
    await queryRunner.query(`
      IF OBJECT_ID('dbo.AdvertisementCampaigns', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.AdvertisementCampaigns (
          AdvertisementCampaignId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AdvertisementCampaigns_Id DEFAULT NEWSEQUENTIALID(),
          FarmerId UNIQUEIDENTIFIER NOT NULL,
          Title NVARCHAR(140) NOT NULL,
          Content NVARCHAR(800) NOT NULL,
          BannerUrl NVARCHAR(1000) NOT NULL,
          TargetUrl NVARCHAR(500) NULL,
          Province NVARCHAR(100) NULL,
          District NVARCHAR(100) NULL,
          DurationDays SMALLINT NOT NULL,
          DailyRate DECIMAL(18,2) NOT NULL,
          TotalAmount DECIMAL(18,2) NOT NULL,
          Status NVARCHAR(20) NOT NULL CONSTRAINT DF_AdvertisementCampaigns_Status DEFAULT 'active',
          StartsAt DATETIME2 NOT NULL,
          EndsAt DATETIME2 NOT NULL,
          ImpressionCount INT NOT NULL CONSTRAINT DF_AdvertisementCampaigns_Impressions DEFAULT 0,
          ClickCount INT NOT NULL CONSTRAINT DF_AdvertisementCampaigns_Clicks DEFAULT 0,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AdvertisementCampaigns_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_AdvertisementCampaigns_UpdatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT PK_AdvertisementCampaigns PRIMARY KEY (AdvertisementCampaignId),
          CONSTRAINT FK_AdvertisementCampaigns_Farmer FOREIGN KEY (FarmerId) REFERENCES dbo.Users(UserId),
          CONSTRAINT CK_AdvertisementCampaigns_Status CHECK (Status IN ('active','paused','cancelled')),
          CONSTRAINT CK_AdvertisementCampaigns_Duration CHECK (DurationDays BETWEEN 1 AND 90),
          CONSTRAINT CK_AdvertisementCampaigns_Money CHECK (DailyRate > 0 AND TotalAmount > 0),
          CONSTRAINT CK_AdvertisementCampaigns_Dates CHECK (EndsAt > StartsAt)
        );
        CREATE INDEX IX_AdvertisementCampaigns_Public ON dbo.AdvertisementCampaigns(Status, StartsAt, EndsAt);
        CREATE INDEX IX_AdvertisementCampaigns_Province ON dbo.AdvertisementCampaigns(Province, Status, EndsAt);
        CREATE INDEX IX_AdvertisementCampaigns_Farmer_CreatedAt ON dbo.AdvertisementCampaigns(FarmerId, CreatedAt DESC);
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`IF OBJECT_ID('dbo.AdvertisementCampaigns', 'U') IS NOT NULL DROP TABLE dbo.AdvertisementCampaigns;`);
    await queryRunner.query(`DELETE FROM dbo.PlatformFeeLedgerEntries WHERE EntryType = 'advertising_fee';`);
    await queryRunner.query(`
      IF OBJECT_ID('dbo.CK_PlatformFeeLedgerEntries_Type', 'C') IS NOT NULL
        ALTER TABLE dbo.PlatformFeeLedgerEntries DROP CONSTRAINT CK_PlatformFeeLedgerEntries_Type;
      ALTER TABLE dbo.PlatformFeeLedgerEntries ADD CONSTRAINT CK_PlatformFeeLedgerEntries_Type CHECK (
        EntryType IN ('buyer_transaction_fee','seller_transaction_fee','payment','discount','waiver','adjustment','refund')
      );
    `);
  }
}
