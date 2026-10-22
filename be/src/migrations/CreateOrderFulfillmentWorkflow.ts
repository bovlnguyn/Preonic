import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderFulfillmentWorkflow1792630800000 implements MigrationInterface {
  name = 'CreateOrderFulfillmentWorkflow1792630800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.FulfillmentOrders', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.FulfillmentOrders (
          OrderId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_FulfillmentOrders_Id DEFAULT NEWSEQUENTIALID(),
          ContractId UNIQUEIDENTIFIER NOT NULL,
          Stage NVARCHAR(30) NOT NULL CONSTRAINT DF_FulfillmentOrders_Stage DEFAULT 'cultivating',
          Carrier NVARCHAR(30) NOT NULL CONSTRAINT DF_FulfillmentOrders_Carrier DEFAULT 'ghn',
          TrackingCode NVARCHAR(100) NULL,
          CarrierStatus NVARCHAR(100) NULL,
          LoadingPhotoUrl NVARCHAR(1000) NULL,
          ReportIntervalDays SMALLINT NOT NULL CONSTRAINT DF_FulfillmentOrders_ReportInterval DEFAULT 7,
          NextReportDueAt DATETIME2 NULL,
          HandedToCarrierAt DATETIME2 NULL,
          EnterpriseReceivedAt DATETIME2 NULL,
          CompletedAt DATETIME2 NULL,
          LastCarrierSyncAt DATETIME2 NULL,
          CurrentLocation NVARCHAR(500) NULL,
          CurrentLatitude DECIMAL(10,7) NULL,
          CurrentLongitude DECIMAL(10,7) NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_FulfillmentOrders_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_FulfillmentOrders_UpdatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT PK_FulfillmentOrders PRIMARY KEY (OrderId),
          CONSTRAINT UX_FulfillmentOrders_Contract UNIQUE (ContractId),
          CONSTRAINT FK_FulfillmentOrders_Contract FOREIGN KEY (ContractId) REFERENCES dbo.Contracts(ContractId),
          CONSTRAINT CK_FulfillmentOrders_Stage CHECK (Stage IN ('cultivating','ready_to_ship','in_transit','delivered','completed')),
          CONSTRAINT CK_FulfillmentOrders_Carrier CHECK (Carrier IN ('ghn','manual')),
          CONSTRAINT CK_FulfillmentOrders_ReportInterval CHECK (ReportIntervalDays BETWEEN 1 AND 90)
        );
        CREATE INDEX IX_FulfillmentOrders_Stage_UpdatedAt ON dbo.FulfillmentOrders(Stage, UpdatedAt DESC);
        CREATE INDEX IX_FulfillmentOrders_TrackingCode ON dbo.FulfillmentOrders(TrackingCode) WHERE TrackingCode IS NOT NULL;
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.CropProgressReports', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.CropProgressReports (
          ReportId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CropProgressReports_Id DEFAULT NEWSEQUENTIALID(),
          OrderId UNIQUEIDENTIFIER NOT NULL,
          RequestedBy UNIQUEIDENTIFIER NULL,
          RequestType NVARCHAR(20) NOT NULL CONSTRAINT DF_CropProgressReports_Type DEFAULT 'periodic',
          Status NVARCHAR(20) NOT NULL CONSTRAINT DF_CropProgressReports_Status DEFAULT 'requested',
          Title NVARCHAR(200) NOT NULL,
          RequestNote NVARCHAR(1000) NULL,
          FarmerNote NVARCHAR(2000) NULL,
          ImageUrls NVARCHAR(MAX) NULL,
          DueAt DATETIME2 NULL,
          SubmittedAt DATETIME2 NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CropProgressReports_CreatedAt DEFAULT SYSUTCDATETIME(),
          UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_CropProgressReports_UpdatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT PK_CropProgressReports PRIMARY KEY (ReportId),
          CONSTRAINT FK_CropProgressReports_Order FOREIGN KEY (OrderId) REFERENCES dbo.FulfillmentOrders(OrderId) ON DELETE CASCADE,
          CONSTRAINT FK_CropProgressReports_Requester FOREIGN KEY (RequestedBy) REFERENCES dbo.Users(UserId),
          CONSTRAINT CK_CropProgressReports_Type CHECK (RequestType IN ('periodic','enterprise')),
          CONSTRAINT CK_CropProgressReports_Status CHECK (Status IN ('requested','submitted'))
        );
        CREATE INDEX IX_CropProgressReports_Order_CreatedAt ON dbo.CropProgressReports(OrderId, CreatedAt DESC);
        CREATE INDEX IX_CropProgressReports_Order_Status_DueAt ON dbo.CropProgressReports(OrderId, Status, DueAt);
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('dbo.ShipmentTrackingEvents', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.ShipmentTrackingEvents (
          TrackingEventId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ShipmentTrackingEvents_Id DEFAULT NEWSEQUENTIALID(),
          OrderId UNIQUEIDENTIFIER NOT NULL,
          ProviderEventId NVARCHAR(180) NULL,
          Source NVARCHAR(20) NOT NULL CONSTRAINT DF_ShipmentTrackingEvents_Source DEFAULT 'manual',
          Status NVARCHAR(100) NOT NULL,
          Description NVARCHAR(1000) NULL,
          Location NVARCHAR(500) NULL,
          Latitude DECIMAL(10,7) NULL,
          Longitude DECIMAL(10,7) NULL,
          OccurredAt DATETIME2 NOT NULL,
          RawPayload NVARCHAR(MAX) NULL,
          CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ShipmentTrackingEvents_CreatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT PK_ShipmentTrackingEvents PRIMARY KEY (TrackingEventId),
          CONSTRAINT FK_ShipmentTrackingEvents_Order FOREIGN KEY (OrderId) REFERENCES dbo.FulfillmentOrders(OrderId) ON DELETE CASCADE,
          CONSTRAINT CK_ShipmentTrackingEvents_Source CHECK (Source IN ('manual','ghn'))
        );
        CREATE INDEX IX_ShipmentTrackingEvents_Order_OccurredAt ON dbo.ShipmentTrackingEvents(OrderId, OccurredAt DESC);
        CREATE UNIQUE INDEX UX_ShipmentTrackingEvents_ProviderEvent ON dbo.ShipmentTrackingEvents(ProviderEventId) WHERE ProviderEventId IS NOT NULL;
      END
    `);

    await queryRunner.query(`
      INSERT INTO dbo.FulfillmentOrders (
        ContractId, Stage, Carrier, ReportIntervalDays, NextReportDueAt,
        HandedToCarrierAt, EnterpriseReceivedAt, CompletedAt, CreatedAt, UpdatedAt
      )
      SELECT
        c.ContractId,
        CASE
          WHEN c.Status = 'completed' THEN 'completed'
          WHEN c.DeliveryStatus = 'delivered' THEN 'delivered'
          WHEN c.DeliveryStatus = 'shipping' THEN 'in_transit'
          WHEN c.DeliveryStatus = 'preparing' THEN 'ready_to_ship'
          ELSE 'cultivating'
        END,
        'ghn', 7,
        CASE WHEN c.DeliveryStatus IN ('pending', 'preparing') OR c.DeliveryStatus IS NULL THEN DATEADD(day, 7, SYSUTCDATETIME()) ELSE NULL END,
        CASE WHEN c.DeliveryStatus IN ('shipping', 'delivered') THEN COALESCE(c.UpdatedAt, c.CreatedAt) ELSE NULL END,
        c.DeliveredAt,
        c.CompletedAt,
        c.CreatedAt,
        c.UpdatedAt
      FROM dbo.Contracts c
      WHERE c.Status IN ('active', 'completed')
        AND NOT EXISTS (SELECT 1 FROM dbo.FulfillmentOrders o WHERE o.ContractId = c.ContractId);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`IF OBJECT_ID('dbo.ShipmentTrackingEvents', 'U') IS NOT NULL DROP TABLE dbo.ShipmentTrackingEvents;`);
    await queryRunner.query(`IF OBJECT_ID('dbo.CropProgressReports', 'U') IS NOT NULL DROP TABLE dbo.CropProgressReports;`);
    await queryRunner.query(`IF OBJECT_ID('dbo.FulfillmentOrders', 'U') IS NOT NULL DROP TABLE dbo.FulfillmentOrders;`);
  }
}
