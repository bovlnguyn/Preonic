-- ============================================================
--  PREONIC DATABASE V2 - FULL BOOTSTRAP FOR SQL SERVER
--  Canonical fresh-install schema for the direct-settlement payment model.
--  This file is self-contained. No TypeORM migration is required afterwards.
--  Run this file first, then run 02_Preonic_V2_SeedData.sql.
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'preonic_v2')
    CREATE DATABASE [preonic_v2]
        COLLATE Vietnamese_CI_AS;
GO

USE [preonic_v2];
GO

IF EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    THROW 50000, N'Database preonic_v2 đã có bảng dữ liệu. Hãy dùng database trống hoặc xóa database local cũ trước khi chạy file bootstrap này.', 1;
END
GO

-- ============================================================
-- 0. ENUMS → lookup tables (dùng thay cho CHECK ngắn gọn hơn)
-- ============================================================

-- Dùng CHECK constraint trực tiếp trên từng bảng cho gọn.
-- Không cần bảng lookup riêng trừ khi business yêu cầu mở rộng.

-- ============================================================
-- [01] USERS
-- ============================================================
CREATE TABLE Users (
    UserId              UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    Email               NVARCHAR(255)       NOT NULL,
    Password            NVARCHAR(255)       NOT NULL,                     -- bcrypt hash
    Role                NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_Users_Role CHECK (Role IN ('farmer','enterprise','admin')),
    AuthProvider        NVARCHAR(20)        NOT NULL
        CONSTRAINT DF_Users_AuthProvider DEFAULT 'local'
        CONSTRAINT CK_Users_AuthProvider CHECK (AuthProvider IN ('local','google')),
    FirstName           NVARCHAR(100)       NULL,
    LastName            NVARCHAR(100)       NULL,
    FullName            AS (LTRIM(ISNULL(FirstName,N'') + N' ' + ISNULL(LastName,N''))) PERSISTED,
    Phone               NVARCHAR(20)        NULL,
    Avatar              NVARCHAR(500)       NULL,
    IsActive            BIT                 NOT NULL DEFAULT 1,
    IsVerified          BIT                 NOT NULL DEFAULT 0,
    EmailVerificationToken  NVARCHAR(255)   NULL,
    EmailVerificationExpires DATETIME2      NULL,
    RefreshToken        NVARCHAR(512)       NULL,
    PasswordResetToken  NVARCHAR(255)       NULL,
    PasswordResetExpires DATETIME2          NULL,
    PasswordChangedAt   DATETIME2           NULL,
    LastLogin           DATETIME2           NULL,
    LoginAttempts       TINYINT             NOT NULL DEFAULT 0,
    LockUntil           DATETIME2           NULL,
    Province            NVARCHAR(100)       NULL,
    District            NVARCHAR(100)       NULL,
    Ward                NVARCHAR(100)       NULL,
    Address             NVARCHAR(500)       NULL,
    FarmName            NVARCHAR(255)       NULL,
    FarmSize            DECIMAL(10,2)       NULL,
    CompanyName         NVARCHAR(255)       NULL,
    TaxCode             NVARCHAR(20)        NULL,
    Latitude            DECIMAL(10,7)       NULL,
    Longitude           DECIMAL(10,7)       NULL,
    ReputationScore     DECIMAL(3,2)        NOT NULL DEFAULT 0.00,
    TotalRatings        INT                 NOT NULL DEFAULT 0,
    CreatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);

CREATE INDEX IX_Users_Role               ON Users (Role);
CREATE INDEX IX_Users_IsActive           ON Users (IsActive);
CREATE INDEX IX_Users_CreatedAt
    ON Users (CreatedAt DESC)
    INCLUDE (Role, IsActive, FullName, Email);
CREATE INDEX IX_Users_PasswordResetToken ON Users (PasswordResetToken) WHERE PasswordResetToken IS NOT NULL;
CREATE INDEX IX_Users_EmailVerToken      ON Users (EmailVerificationToken) WHERE EmailVerificationToken IS NOT NULL;
CREATE UNIQUE INDEX UX_Users_Phone       ON Users (Phone) WHERE Phone IS NOT NULL;
GO

-- Trigger tự động cập nhật UpdatedAt
CREATE OR ALTER TRIGGER TR_Users_UpdatedAt
ON Users AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET UpdatedAt = SYSUTCDATETIME()
    WHERE UserId IN (SELECT UserId FROM inserted);
END;
GO

-- ============================================================
-- [02] PRODUCTS
-- ============================================================
CREATE TABLE Products (
    ProductId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    Name            NVARCHAR(255)       NOT NULL,
    Location        NVARCHAR(255)       NULL,
    Farm            NVARCHAR(255)       NULL,
    Image           NVARCHAR(500)       NULL,
    Images          NVARCHAR(MAX)       NULL,                    -- JSON array of image URLs
    PriceMin        DECIMAL(18,2)       NULL,
    PriceMax        DECIMAL(18,2)       NULL,
    Unit            NVARCHAR(50)        NULL,
    PriceUnit       NVARCHAR(50)        NULL,
    Variety         NVARCHAR(200)       NULL,
    Area            DECIMAL(10,2)       NULL,
    PlantDate       DATE                NULL,
    ExpectedDate    DATE                NULL,
    Progress        DECIMAL(5,2)        NULL DEFAULT 0,          -- %
    Remaining       DECIMAL(18,2)       NULL,
    TotalQuantity   DECIMAL(18,2)       NULL,
    Note            NVARCHAR(MAX)       NULL,
    Badge           NVARCHAR(100)       NULL,
    Category        NVARCHAR(30)        NOT NULL
        CONSTRAINT CK_Products_Category
            CHECK (Category IN ('fruit','vegetable','rice','coffee','tea','spice','grain','other')),
    Region          NVARCHAR(10)        NOT NULL
        CONSTRAINT CK_Products_Region
            CHECK (Region IN ('north','central','south')),
    Type            NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_Products_Type
            CHECK (Type IN ('fresh','dried','processed')),
    Rating          DECIMAL(3,2)        NOT NULL DEFAULT 0.00,
    ReviewCount     INT                 NOT NULL DEFAULT 0,
    Description     NVARCHAR(MAX)       NULL,
    NutritionInfo   NVARCHAR(MAX)       NULL,                    -- lưu dạng JSON text

    -- Seller snapshot (embed để render nhanh, tương tự MongoDB)
    SellerUserId        UNIQUEIDENTIFIER    NULL,
    SellerName          NVARCHAR(200)       NULL,
    SellerAvatar        NVARCHAR(500)       NULL,
    SellerRating        DECIMAL(3,2)        NULL,
    SellerTotalContracts INT               NULL,

    CreatedBy       UNIQUEIDENTIFIER    NOT NULL,
    IsActive        BIT                 NOT NULL DEFAULT 1,
    CoverageRate    TINYINT             NOT NULL
        CONSTRAINT DF_Products_CoverageRate DEFAULT 50
        CONSTRAINT CK_Products_CoverageRate CHECK (CoverageRate >= 0 AND CoverageRate <= 100),
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Products PRIMARY KEY (ProductId),
    CONSTRAINT FK_Products_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Users (UserId)
);

CREATE INDEX IX_Products_Category  ON Products (Category);
CREATE INDEX IX_Products_Region    ON Products (Region);
CREATE INDEX IX_Products_IsActive  ON Products (IsActive);
CREATE INDEX IX_Products_CreatedBy ON Products (CreatedBy);
CREATE INDEX IX_Products_CreatedBy_IsActive_CreatedAt ON Products (CreatedBy, IsActive, CreatedAt);
CREATE INDEX IX_Products_IsActive_CreatedAt ON Products (IsActive, CreatedAt);
CREATE INDEX IX_Products_IsActive_Category_CreatedAt ON Products (IsActive, Category, CreatedAt);
CREATE INDEX IX_Products_IsActive_Region_CreatedAt ON Products (IsActive, Region, CreatedAt);
-- Ghi chú: Full-Text Index yêu cầu SQL Server Standard/Enterprise.
-- SQL Express không hỗ trợ. Dùng LIKE để tìm kiếm text thay thế.
-- Nếu nâng cấp edition thì bỏ comment 2 dòng dưới:
-- CREATE FULLTEXT CATALOG FTC_Products AS DEFAULT;
-- CREATE FULLTEXT INDEX ON Products (Name, Location, Farm) KEY INDEX PK_Products ON FTC_Products;
GO

-- Bảng con cho Certifications (1-N, thay array trong MongoDB)
CREATE TABLE ProductCertifications (
    CertId      INT                 NOT NULL IDENTITY(1,1),
    ProductId   UNIQUEIDENTIFIER    NOT NULL,
    Value       NVARCHAR(200)       NOT NULL,
    FileUrl     NVARCHAR(500)       NULL,
    SortOrder   TINYINT             NOT NULL DEFAULT 0,

    CONSTRAINT PK_ProductCertifications PRIMARY KEY (CertId),
    CONSTRAINT FK_ProdCert_Product FOREIGN KEY (ProductId) REFERENCES Products (ProductId) ON DELETE CASCADE
);

-- Bảng con cho Commitments (1-N)
CREATE TABLE ProductCommitments (
    CommitId    INT                 NOT NULL IDENTITY(1,1),
    ProductId   UNIQUEIDENTIFIER    NOT NULL,
    Value       NVARCHAR(500)       NOT NULL,
    SortOrder   TINYINT             NOT NULL DEFAULT 0,

    CONSTRAINT PK_ProductCommitments PRIMARY KEY (CommitId),
    CONSTRAINT FK_ProdCommit_Product FOREIGN KEY (ProductId) REFERENCES Products (ProductId) ON DELETE CASCADE
);

GO

-- Trigger tự động cập nhật UpdatedAt
CREATE OR ALTER TRIGGER TR_Products_UpdatedAt
ON Products AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Products SET UpdatedAt = SYSUTCDATETIME()
    WHERE ProductId IN (SELECT ProductId FROM inserted);
END;
GO

-- ============================================================
-- [03] REVIEWS
-- ============================================================
CREATE TABLE Reviews (
    ReviewId        UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ProductId       UNIQUEIDENTIFIER    NOT NULL,
    ReviewerId      UNIQUEIDENTIFIER    NOT NULL,
    ReviewerName    NVARCHAR(200)       NULL,
    ReviewerAvatar  NVARCHAR(500)       NULL,
    Rating          TINYINT             NOT NULL
        CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5),
    Text            NVARCHAR(MAX)       NULL,
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Reviews PRIMARY KEY (ReviewId),
    CONSTRAINT UQ_Reviews_Product_Reviewer UNIQUE (ProductId, ReviewerId),      -- 1 review / user / sản phẩm
    CONSTRAINT FK_Reviews_Product  FOREIGN KEY (ProductId)  REFERENCES Products (ProductId) ON DELETE CASCADE,
    CONSTRAINT FK_Reviews_Reviewer FOREIGN KEY (ReviewerId) REFERENCES Users    (UserId)
);
CREATE INDEX IX_Reviews_Product_CreatedAt
    ON Reviews (ProductId, CreatedAt DESC)
    INCLUDE (ReviewerId, Rating, ReviewerName, ReviewerAvatar);
GO

-- Trigger tính lại Rating và ReviewCount trên Products
CREATE OR ALTER TRIGGER TR_Reviews_RecalcRating
ON Reviews AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @pids TABLE (ProductId UNIQUEIDENTIFIER);
    INSERT INTO @pids SELECT DISTINCT ProductId FROM inserted;
    INSERT INTO @pids SELECT DISTINCT ProductId FROM deleted;

    UPDATE p
    SET    Rating      = ISNULL(r.AvgRating, 0),
           ReviewCount = ISNULL(r.Cnt, 0),
           UpdatedAt   = SYSUTCDATETIME()
    FROM   Products p
    INNER JOIN @pids t ON p.ProductId = t.ProductId
    OUTER APPLY (
        SELECT AVG(CAST(Rating AS DECIMAL(3,2))) AS AvgRating,
               COUNT(*) AS Cnt
        FROM   Reviews
        WHERE  ProductId = p.ProductId
    ) r;
END;
GO

-- ============================================================
-- [04] CONTRACTS
-- ============================================================
CREATE TABLE Contracts (
    ContractId          UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ContractCode        NVARCHAR(20)        NOT NULL,           -- PRE-YYYY-XXXX
    ProductId           UNIQUEIDENTIFIER    NOT NULL,
    FarmerId            UNIQUEIDENTIFIER    NOT NULL,
    EnterpriseId        UNIQUEIDENTIFIER    NOT NULL,
    FarmerName          NVARCHAR(200)       NULL,
    EnterpriseName      NVARCHAR(200)       NULL,
    ProductName         NVARCHAR(255)       NULL,
    Quantity            DECIMAL(18,2)       NOT NULL,
    Unit                NVARCHAR(50)        NULL,
    PricePerUnit        DECIMAL(18,2)       NOT NULL,
    TotalValue          DECIMAL(18,2)       NOT NULL,
    FirstPaymentPercentage DECIMAL(5,2)     NULL,
    PaymentFlow         NVARCHAR(20)        NOT NULL
        CONSTRAINT DF_Contracts_PaymentFlow DEFAULT 'direct_v2'
        CONSTRAINT CK_Contracts_PaymentFlow CHECK (PaymentFlow = 'direct_v2'),
    PaymentTerms        NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_Contracts_PaymentTerms
            CHECK (PaymentTerms IN ('50_50','30_70','100_delivery','100_upfront','custom')),
    DeliveryDate        DATE                NULL,
    DeliveryAddress     NVARCHAR(500)       NULL,
    Notes               NVARCHAR(MAX)       NULL,
    Status              NVARCHAR(30)        NOT NULL
        CONSTRAINT DF_Contracts_Status DEFAULT 'draft'
        CONSTRAINT CK_Contracts_Status
            CHECK (Status IN ('draft','pending','active','cancel_pending','completed','cancelled','disputed')),
    SignedByFarmer      BIT                 NOT NULL DEFAULT 0,
    SignedByEnterprise  BIT                 NOT NULL DEFAULT 0,
    SignedAt            DATETIME2           NULL,
    CompletedAt         DATETIME2           NULL,
    CancelledAt         DATETIME2           NULL,
    CancelReason        NVARCHAR(500)       NULL,
    FarmLocation        NVARCHAR(500)       NULL,

    -- Insurance farmer
    InsuranceFarmerType         NVARCHAR(100)   NULL,
    InsuranceFarmerProvider     NVARCHAR(200)   NULL,
    InsuranceFarmerDetails      NVARCHAR(MAX)   NULL,

    -- Insurance enterprise
    InsuranceEnterpriseType     NVARCHAR(100)   NULL,
    InsuranceEnterpriseProvider NVARCHAR(200)   NULL,
    InsuranceEnterpriseDetails  NVARCHAR(MAX)   NULL,

    -- Current insurance workflow
    InsuranceEnabled            BIT             NOT NULL
        CONSTRAINT DF_Contracts_InsuranceEnabled DEFAULT 0,
    InsuranceProvider           NVARCHAR(100)   NULL,
    InsurancePackage            NVARCHAR(100)   NULL,
    InsuranceFee                DECIMAL(18,2)   NULL,
    InsuranceStatus             NVARCHAR(30)    NULL,
    InsurancePolicyNumber       NVARCHAR(100)   NULL,
    InsuredValue                DECIMAL(18,2)   NULL,
    InsuranceCoveredEvents      NVARCHAR(30)    NULL,
    InsuranceValidFrom          DATE            NULL,
    InsuranceValidTo            DATE            NULL,
    InsuranceRiskSharingTerms   NVARCHAR(MAX)   NULL,

    -- Direct payment and delivery snapshots
    PaidAmount          DECIMAL(18,2)       NULL
        CONSTRAINT DF_Contracts_PaidAmount DEFAULT 0,
    RemainingAmount     DECIMAL(18,2)       NULL,
    DeliveryStatus      NVARCHAR(30)        NULL,
    DeliveredAt         DATETIME2           NULL,
    DeliveryNote        NVARCHAR(500)       NULL,

    RiskSharingTerms    NVARCHAR(MAX)       NULL,
    CreatedBy           UNIQUEIDENTIFIER    NULL,
    UpdatedBy           UNIQUEIDENTIFIER    NULL,
    CancelRequestedBy   UNIQUEIDENTIFIER    NULL,
    CreatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Contracts    PRIMARY KEY (ContractId),
    CONSTRAINT UQ_ContractCode UNIQUE (ContractCode),
    CONSTRAINT FK_Contracts_Product    FOREIGN KEY (ProductId)    REFERENCES Products (ProductId),
    CONSTRAINT FK_Contracts_Farmer     FOREIGN KEY (FarmerId)     REFERENCES Users    (UserId),
    CONSTRAINT FK_Contracts_Enterprise FOREIGN KEY (EnterpriseId) REFERENCES Users    (UserId),
    CONSTRAINT CK_Contracts_DeliveryStatus_Direct
        CHECK (DeliveryStatus IS NULL OR DeliveryStatus IN ('pending','preparing','shipping','delivered','failed'))
);

CREATE INDEX IX_Contracts_Farmer_Status     ON Contracts (FarmerId,     Status);
CREATE INDEX IX_Contracts_Enterprise_Status ON Contracts (EnterpriseId, Status);
CREATE INDEX IX_Contracts_Status            ON Contracts (Status);
CREATE INDEX IX_Contracts_Farmer_CreatedAt ON Contracts (FarmerId, CreatedAt);
CREATE INDEX IX_Contracts_Enterprise_CreatedAt ON Contracts (EnterpriseId, CreatedAt);
CREATE INDEX IX_Contracts_CreatedAt
    ON Contracts (CreatedAt DESC)
    INCLUDE (Status, ContractCode, FarmerName, EnterpriseName, TotalValue);
CREATE INDEX IX_Contracts_UnsignedExpiry
    ON Contracts (Status, SignedByFarmer, UpdatedAt)
    INCLUDE (ContractId);
CREATE INDEX IX_Contracts_PaymentFlow_Status
    ON Contracts (PaymentFlow, Status);
CREATE INDEX IX_Contracts_Product_Enterprise_Status_Delivery
    ON Contracts (ProductId, EnterpriseId, Status, DeliveryStatus)
    INCLUDE (FarmerId, ContractCode, DeliveryDate);
GO

CREATE OR ALTER TRIGGER TR_Contracts_UpdatedAt
ON Contracts AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Contracts SET UpdatedAt = SYSUTCDATETIME()
    WHERE ContractId IN (SELECT ContractId FROM inserted);
END;
GO

-- ============================================================
-- [06] DISPUTES
-- ============================================================
CREATE TABLE Disputes (
    DisputeId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ContractId      UNIQUEIDENTIFIER    NOT NULL,
    RaisedBy        UNIQUEIDENTIFIER    NOT NULL,
    RaisedByRole    NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_Disputes_RaisedByRole CHECK (RaisedByRole IN ('farmer','enterprise')),
    AgainstUserId   UNIQUEIDENTIFIER    NOT NULL,
    Reason          NVARCHAR(MAX)       NOT NULL,
    Status          NVARCHAR(20)        NOT NULL DEFAULT 'open'
        CONSTRAINT CK_Disputes_Status
            CHECK (Status IN ('open','under_review','resolved','closed')),
    AdminNotes      NVARCHAR(MAX)       NULL,
    ResolvedAt      DATETIME2           NULL,
    Resolution      NVARCHAR(MAX)       NULL,
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Disputes          PRIMARY KEY (DisputeId),
    CONSTRAINT FK_Disputes_Contract FOREIGN KEY (ContractId)    REFERENCES Contracts (ContractId),
    CONSTRAINT FK_Disputes_RaisedBy FOREIGN KEY (RaisedBy)      REFERENCES Users     (UserId),
    CONSTRAINT FK_Disputes_Against  FOREIGN KEY (AgainstUserId) REFERENCES Users     (UserId)
);

CREATE INDEX IX_Disputes_ContractId ON Disputes (ContractId);
CREATE INDEX IX_Disputes_RaisedBy   ON Disputes (RaisedBy);
CREATE INDEX IX_Disputes_Status     ON Disputes (Status);
CREATE INDEX IX_Disputes_RaisedBy_Status_CreatedAt ON Disputes (RaisedBy, Status, CreatedAt);
CREATE INDEX IX_Disputes_Against_Status_CreatedAt ON Disputes (AgainstUserId, Status, CreatedAt);

-- Evidence files (array embed → bảng riêng)
CREATE TABLE DisputeEvidences (
    EvidenceId  INT                 NOT NULL IDENTITY(1,1),
    DisputeId   UNIQUEIDENTIFIER    NOT NULL,
    FileUrl     NVARCHAR(500)       NOT NULL,
    FileType    NVARCHAR(50)        NULL,
    UploadedAt  DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_DisputeEvidences PRIMARY KEY (EvidenceId),
    CONSTRAINT FK_Evidence_Dispute FOREIGN KEY (DisputeId) REFERENCES Disputes (DisputeId) ON DELETE CASCADE
);
GO

CREATE OR ALTER TRIGGER TR_Disputes_UpdatedAt
ON Disputes AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Disputes SET UpdatedAt = SYSUTCDATETIME()
    WHERE DisputeId IN (SELECT DisputeId FROM inserted);
END;
GO

-- ============================================================
-- [08] NOTIFICATIONS
-- ============================================================
CREATE TABLE Notifications (
    NotificationId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    Type            NVARCHAR(100)       NOT NULL,
    Title           NVARCHAR(300)       NOT NULL,
    Message         NVARCHAR(MAX)       NULL,
    IsRead          BIT                 NOT NULL DEFAULT 0,
    RelatedId       NVARCHAR(100)       NULL,                   -- generic ref
    RelatedModel    NVARCHAR(100)       NULL,
    Severity        NVARCHAR(10)        NOT NULL DEFAULT 'info'
        CONSTRAINT CK_Notif_Severity CHECK (Severity IN ('info','warning','critical')),
    EmailSent       BIT                 NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Notifications PRIMARY KEY (NotificationId),
    CONSTRAINT FK_Notif_User FOREIGN KEY (UserId) REFERENCES Users (UserId) ON DELETE CASCADE
);

CREATE INDEX IX_Notif_UserId_Created ON Notifications (UserId, CreatedAt DESC);
CREATE INDEX IX_Notif_UserId_IsRead  ON Notifications (UserId, IsRead);
CREATE INDEX IX_Notif_Type           ON Notifications (Type);
GO

-- ============================================================
-- [09] WEATHER ALERTS
-- ============================================================
CREATE TABLE WeatherAlerts (
    WeatherAlertId      UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    UserId              UNIQUEIDENTIFIER    NOT NULL,
    ContractId          UNIQUEIDENTIFIER    NULL,
    AlertType           NVARCHAR(100)       NOT NULL,
    Severity            NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_WA_Severity CHECK (Severity IN ('low','medium','high','warning','critical')),
    -- Location
    Province            NVARCHAR(100)       NULL,
    District            NVARCHAR(100)       NULL,
    Latitude            DECIMAL(10,7)       NULL,
    Longitude           DECIMAL(10,7)       NULL,
    -- Weather data
    Temperature         DECIMAL(5,2)        NULL,
    Humidity            DECIMAL(5,2)        NULL,
    WindSpeed           DECIMAL(7,2)        NULL,
    Rain1h              DECIMAL(7,2)        NULL,
    Rain24h             DECIMAL(7,2)        NULL,
    WeatherDescription  NVARCHAR(200)       NULL,
    WeatherIcon         NVARCHAR(50)        NULL,
    ThresholdExceeded   NVARCHAR(200)       NULL,
    Message             NVARCHAR(MAX)       NULL,
    IsRead              BIT                 NOT NULL DEFAULT 0,
    CreatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_WeatherAlerts PRIMARY KEY (WeatherAlertId),
    CONSTRAINT FK_WA_User       FOREIGN KEY (UserId)     REFERENCES Users (UserId) ON DELETE CASCADE,
    CONSTRAINT FK_WA_Contract   FOREIGN KEY (ContractId) REFERENCES Contracts (ContractId)
);

CREATE INDEX IX_WA_UserId_Created ON WeatherAlerts (UserId, CreatedAt DESC);
CREATE INDEX IX_WA_AlertType      ON WeatherAlerts (AlertType);
CREATE INDEX IX_WA_Severity       ON WeatherAlerts (Severity);
CREATE INDEX IX_WA_Province       ON WeatherAlerts (Province);
GO

-- ============================================================
-- [10] CONVERSATIONS
-- ============================================================
CREATE TABLE Conversations (
    ConversationId  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    LastMessage     NVARCHAR(MAX)       NULL,
    LastMessageAt   DATETIME2           NULL,
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Conversations PRIMARY KEY (ConversationId)
);

-- Participants (array embed → junction table)
CREATE TABLE ConversationParticipants (
    ConversationId  UNIQUEIDENTIFIER    NOT NULL,
    UserId          UNIQUEIDENTIFIER    NOT NULL,
    JoinedAt        DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ConvParticipants PRIMARY KEY (ConversationId, UserId),
    CONSTRAINT FK_ConvPart_Conv FOREIGN KEY (ConversationId) REFERENCES Conversations (ConversationId) ON DELETE CASCADE,
    CONSTRAINT FK_ConvPart_User FOREIGN KEY (UserId)         REFERENCES Users         (UserId)
);

CREATE INDEX IX_ConvPart_UserId ON ConversationParticipants (UserId);
CREATE INDEX IX_ConversationParticipants_UserId_ConversationId
    ON ConversationParticipants (UserId, ConversationId);
CREATE INDEX IX_Conversations_LastMessageAt_CreatedAt
    ON Conversations (LastMessageAt, CreatedAt);
GO

-- ============================================================
-- [11] MESSAGES
-- ============================================================
CREATE TABLE Messages (
    MessageId       UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ConversationId  UNIQUEIDENTIFIER    NOT NULL,
    SenderId        UNIQUEIDENTIFIER    NOT NULL,
    Text            NVARCHAR(MAX)       NULL,
    CreatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Messages          PRIMARY KEY (MessageId),
    CONSTRAINT FK_Msg_Conversation  FOREIGN KEY (ConversationId) REFERENCES Conversations (ConversationId) ON DELETE CASCADE,
    CONSTRAINT FK_Msg_Sender        FOREIGN KEY (SenderId)       REFERENCES Users         (UserId)
);

CREATE INDEX IX_Msg_Conv_Created ON Messages (ConversationId, CreatedAt DESC);

-- Message Attachments (array embed → bảng riêng)
CREATE TABLE MessageAttachments (
    AttachmentId    INT                 NOT NULL IDENTITY(1,1),
    MessageId       UNIQUEIDENTIFIER    NOT NULL,
    FileUrl         NVARCHAR(500)       NOT NULL,
    FileType        NVARCHAR(50)        NULL,
    FileName        NVARCHAR(255)       NULL,

    CONSTRAINT PK_MessageAttachments PRIMARY KEY (AttachmentId),
    CONSTRAINT FK_Attach_Message FOREIGN KEY (MessageId) REFERENCES Messages (MessageId) ON DELETE CASCADE
);

-- ReadBy (array embed → junction table)
CREATE TABLE MessageReadBy (
    MessageId   UNIQUEIDENTIFIER    NOT NULL,
    UserId      UNIQUEIDENTIFIER    NOT NULL,
    ReadAt      DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_MessageReadBy PRIMARY KEY (MessageId, UserId),
    CONSTRAINT FK_ReadBy_Message FOREIGN KEY (MessageId) REFERENCES Messages (MessageId) ON DELETE CASCADE,
    CONSTRAINT FK_ReadBy_User    FOREIGN KEY (UserId)    REFERENCES Users    (UserId)
);
CREATE INDEX IX_MessageReadBy_UserId_MessageId ON MessageReadBy (UserId, MessageId);
GO

-- ============================================================
-- [12] PARTNER RATINGS
-- ============================================================
CREATE TABLE PartnerRatings (
    PartnerRatingId     UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    ContractId          UNIQUEIDENTIFIER    NOT NULL,
    ReviewerId          UNIQUEIDENTIFIER    NOT NULL,
    RevieweeId          UNIQUEIDENTIFIER    NOT NULL,
    ReviewerRole        NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_PR_ReviewerRole CHECK (ReviewerRole IN ('farmer','enterprise')),
    RevieweeRole        NVARCHAR(20)        NOT NULL
        CONSTRAINT CK_PR_RevieweeRole CHECK (RevieweeRole IN ('farmer','enterprise')),

    -- Farmer → Enterprise criteria
    Transparency        TINYINT             NULL
        CONSTRAINT CK_PR_Transparency     CHECK (Transparency     BETWEEN 1 AND 5),
    PaymentPunctuality  TINYINT             NULL
        CONSTRAINT CK_PR_PayPunctuality   CHECK (PaymentPunctuality BETWEEN 1 AND 5),
    Coordination        TINYINT             NULL
        CONSTRAINT CK_PR_Coordination     CHECK (Coordination     BETWEEN 1 AND 5),

    -- Enterprise → Farmer criteria
    Quality             TINYINT             NULL
        CONSTRAINT CK_PR_Quality          CHECK (Quality          BETWEEN 1 AND 5),
    OnTimeDelivery      TINYINT             NULL
        CONSTRAINT CK_PR_OnTimeDelivery   CHECK (OnTimeDelivery   BETWEEN 1 AND 5),
    CommittedVolume     TINYINT             NULL
        CONSTRAINT CK_PR_CommittedVolume  CHECK (CommittedVolume  BETWEEN 1 AND 5),

    OverallRating       DECIMAL(3,2)        NOT NULL
        CONSTRAINT CK_PR_OverallRating    CHECK (OverallRating    BETWEEN 1 AND 5),
    Comment             NVARCHAR(MAX)       NULL,
    CreatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2           NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PartnerRatings          PRIMARY KEY (PartnerRatingId),
    CONSTRAINT UQ_PR_Contract_Reviewer    UNIQUE (ContractId, ReviewerId),
    CONSTRAINT FK_PR_Contract  FOREIGN KEY (ContractId) REFERENCES Contracts (ContractId),
    CONSTRAINT FK_PR_Reviewer  FOREIGN KEY (ReviewerId) REFERENCES Users     (UserId),
    CONSTRAINT FK_PR_Reviewee  FOREIGN KEY (RevieweeId) REFERENCES Users     (UserId)
);

CREATE INDEX IX_PR_Reviewee_CreatedAt
    ON PartnerRatings (RevieweeId, CreatedAt DESC)
    INCLUDE (ContractId, ReviewerId, ReviewerRole, OverallRating);
CREATE INDEX IX_PR_Reviewer_CreatedAt
    ON PartnerRatings (ReviewerId, CreatedAt DESC)
    INCLUDE (ContractId, RevieweeId, RevieweeRole, OverallRating);
GO

-- Trigger tính lại reputationScore và totalRatings của reviewee
CREATE OR ALTER TRIGGER TR_PartnerRatings_RecalcReputation
ON PartnerRatings AFTER INSERT, UPDATE, DELETE AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @uids TABLE (UserId UNIQUEIDENTIFIER);
    INSERT INTO @uids SELECT DISTINCT RevieweeId FROM inserted;
    INSERT INTO @uids SELECT DISTINCT RevieweeId FROM deleted;

    UPDATE u
    SET    ReputationScore = ISNULL(r.AvgRating, 0),
           TotalRatings    = ISNULL(r.Cnt, 0),
           UpdatedAt       = SYSUTCDATETIME()
    FROM   Users u
    INNER JOIN @uids t ON u.UserId = t.UserId
    OUTER APPLY (
        SELECT AVG(CAST(OverallRating AS DECIMAL(3,2))) AS AvgRating,
               COUNT(*) AS Cnt
        FROM   PartnerRatings
        WHERE  RevieweeId = u.UserId
    ) r;
END;
GO

-- ============================================================
-- [13] SYSTEM LOGS
-- ============================================================
CREATE TABLE SystemLogs (
    LogId       INT                 NOT NULL IDENTITY(1,1),
    Category    NVARCHAR(30)        NOT NULL,
    Action      NVARCHAR(60)        NOT NULL,
    Level       NVARCHAR(10)        NOT NULL
        CONSTRAINT DF_SystemLogs_Level DEFAULT 'info',
    UserId      UNIQUEIDENTIFIER    NULL,
    TargetType  NVARCHAR(30)        NULL,
    TargetId    NVARCHAR(100)       NULL,
    Message     NVARCHAR(1000)      NOT NULL,
    Metadata    NVARCHAR(MAX)       NULL,
    StackTrace  NVARCHAR(MAX)       NULL,
    IpAddress   NVARCHAR(45)        NULL,
    CreatedAt   DATETIME2           NOT NULL
        CONSTRAINT DF_SystemLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_SystemLogs PRIMARY KEY (LogId),
    CONSTRAINT FK_SystemLogs_Users
        FOREIGN KEY (UserId) REFERENCES Users (UserId) ON DELETE SET NULL
);

CREATE INDEX IX_SystemLogs_Category_CreatedAt ON SystemLogs (Category, CreatedAt);
CREATE INDEX IX_SystemLogs_Level_CreatedAt ON SystemLogs (Level, CreatedAt);
CREATE INDEX IX_SystemLogs_UserId_CreatedAt ON SystemLogs (UserId, CreatedAt);
GO

-- ============================================================
-- STORED PROCEDURE: Sinh ContractCode theo dạng PRE-YYYY-XXXX
-- ============================================================
CREATE OR ALTER PROCEDURE SP_GenerateContractCode
    @NewCode NVARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @year  CHAR(4)  = CAST(YEAR(GETDATE()) AS CHAR(4));
    DECLARE @seq   INT;

    SELECT @seq = COUNT(*) + 1
    FROM   Contracts
    WHERE  ContractCode LIKE 'PRE-' + @year + '-%';

    SET @NewCode = 'PRE-' + @year + '-' + RIGHT('0000' + CAST(@seq AS NVARCHAR(4)), 4);
END;
GO

-- ============================================================
-- VIEW: Hợp đồng đang hoạt động kèm thông tin 2 bên
-- ============================================================
CREATE OR ALTER VIEW V_ActiveContracts AS
SELECT
    c.ContractId,
    c.ContractCode,
    c.Status,
    c.TotalValue,
    c.DeliveryDate,
    f.FullName   AS FarmerFullName,
    f.Email      AS FarmerEmail,
    e.FullName   AS EnterpriseFullName,
    e.Email      AS EnterpriseEmail,
    p.Name       AS ProductName,
    p.Category,
    p.Region
FROM   Contracts c
JOIN   Users     f ON f.UserId    = c.FarmerId
JOIN   Users     e ON e.UserId    = c.EnterpriseId
JOIN   Products  p ON p.ProductId = c.ProductId
WHERE  c.Status NOT IN ('cancelled');
GO


-- ============================================================
-- [14] DIRECT PAYMENT - FINAL MERGED SCHEMA
-- ============================================================
-- Fresh databases contain only direct goods settlement and separate fee billing.
-- ============================================================

-- ------------------------------------------------------------
-- PLATFORM FEE POLICY
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeePolicies (
    FeePolicyId        UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeePolicies PRIMARY KEY DEFAULT NEWID(),
    Code               NVARCHAR(50)     NOT NULL,
    Name               NVARCHAR(150)    NOT NULL,
    BuyerFeeBps        INT              NOT NULL,
    SellerFeeBps       INT              NOT NULL,
    Currency           CHAR(3)          NOT NULL
        CONSTRAINT DF_PlatformFeePolicies_Currency DEFAULT 'VND',
    IsActive           BIT              NOT NULL
        CONSTRAINT DF_PlatformFeePolicies_IsActive DEFAULT 1,
    EffectiveFrom      DATETIME2        NOT NULL,
    EffectiveTo        DATETIME2        NULL,
    Notes              NVARCHAR(500)    NULL,
    CreatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePolicies_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePolicies_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT CK_PlatformFeePolicies_BuyerFeeBps
        CHECK (BuyerFeeBps BETWEEN 0 AND 10000),
    CONSTRAINT CK_PlatformFeePolicies_SellerFeeBps
        CHECK (SellerFeeBps BETWEEN 0 AND 10000),
    CONSTRAINT CK_PlatformFeePolicies_TotalFee
        CHECK (BuyerFeeBps + SellerFeeBps < 10000),
    CONSTRAINT CK_PlatformFeePolicies_Window
        CHECK (EffectiveTo IS NULL OR EffectiveTo > EffectiveFrom)
);

CREATE UNIQUE INDEX UX_PlatformFeePolicies_Code
    ON dbo.PlatformFeePolicies(Code);
CREATE INDEX IX_PlatformFeePolicies_ActiveWindow
    ON dbo.PlatformFeePolicies(IsActive, EffectiveFrom, EffectiveTo);
GO

-- System configuration, not demo business data. This remains even when demo
-- seed data is reset.
INSERT INTO dbo.PlatformFeePolicies
    (FeePolicyId, Code, Name, BuyerFeeBps, SellerFeeBps, Currency,
     IsActive, EffectiveFrom, Notes)
VALUES
    (NEWID(), 'PREONIC_LAUNCH_08', N'Preonic launch fee 0.8%',
     50, 30, 'VND', 1, SYSUTCDATETIME(),
     N'Enterprise 0.5% + Farmer 0.3%; charged after successful goods payment.');
GO

-- ------------------------------------------------------------
-- FARMER SETTLEMENT BANK ACCOUNTS
-- ------------------------------------------------------------
CREATE TABLE dbo.UserSettlementBankAccounts (
    BankAccountId              UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_UserSettlementBankAccounts PRIMARY KEY DEFAULT NEWID(),
    UserId                     UNIQUEIDENTIFIER NOT NULL,
    BankCode                   NVARCHAR(30)     NOT NULL,
    BankName                   NVARCHAR(100)    NULL,
    AccountHolder              NVARCHAR(150)    NOT NULL,
    AccountNumberCiphertext    NVARCHAR(MAX)    NOT NULL,
    AccountNumberIv            NVARCHAR(64)     NOT NULL,
    AccountNumberAuthTag       NVARCHAR(64)     NOT NULL,
    EncryptionKeyVersion       SMALLINT         NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_KeyVersion DEFAULT 1,
    AccountNumberFingerprint   CHAR(64)         NOT NULL,
    MaskedAccountNumber        NVARCHAR(40)     NOT NULL,
    IsDefault                  BIT              NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_IsDefault DEFAULT 0,
    Status                     NVARCHAR(20)     NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_Status DEFAULT 'active',
    VerificationStatus         NVARCHAR(30)     NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_VerificationStatus DEFAULT 'pending_admin_review',
    AdminReviewedBy            UNIQUEIDENTIFIER NULL,
    AdminReviewedAt            DATETIME2        NULL,
    AdminReviewNote            NVARCHAR(500)    NULL,
    VerifiedAccountHolder      NVARCHAR(150)    NULL,
    VerificationProvider       NVARCHAR(50)     NULL,
    VerificationReference      NVARCHAR(120)    NULL,
    VerifiedAt                 DATETIME2        NULL,
    CreatedAt                  DATETIME2        NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt                  DATETIME2        NOT NULL
        CONSTRAINT DF_UserSettlementBankAccounts_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_UserSettlementBankAccounts_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_UserSettlementBankAccounts_AdminReviewer
        FOREIGN KEY (AdminReviewedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_UserSettlementBankAccounts_Status
        CHECK (Status IN ('active','disabled')),
    CONSTRAINT CK_UserSettlementBankAccounts_VerificationStatus
        CHECK (VerificationStatus IN ('pending_admin_review','awaiting_sepay_link','verified','rejected','failed')),
    CONSTRAINT CK_UserSettlementBankAccounts_AdminReview
        CHECK (
            (VerificationStatus = 'pending_admin_review' AND AdminReviewedBy IS NULL AND AdminReviewedAt IS NULL)
            OR
            (VerificationStatus <> 'pending_admin_review' AND AdminReviewedBy IS NOT NULL AND AdminReviewedAt IS NOT NULL)
        ),
    CONSTRAINT CK_UserSettlementBankAccounts_VerifiedFields
        CHECK (VerificationStatus <> 'verified' OR (VerifiedAccountHolder IS NOT NULL AND VerificationProvider IS NOT NULL AND VerifiedAt IS NOT NULL)),
    CONSTRAINT CK_UserSettlementBankAccounts_DefaultVerified
        CHECK (IsDefault = 0 OR ([Status] = 'active' AND VerificationStatus = 'verified')),
    CONSTRAINT CK_UserSettlementBankAccounts_KeyVersion
        CHECK (EncryptionKeyVersion > 0)
);

CREATE INDEX IX_UserSettlementBankAccounts_User_Status
    ON dbo.UserSettlementBankAccounts(UserId, Status);
CREATE INDEX IX_UserSettlementBankAccounts_User_Verification
    ON dbo.UserSettlementBankAccounts(UserId, VerificationStatus);
CREATE UNIQUE INDEX UX_UserSettlementBankAccounts_User_Fingerprint
    ON dbo.UserSettlementBankAccounts(UserId, AccountNumberFingerprint);
CREATE UNIQUE INDEX UX_UserSettlementBankAccounts_Default
    ON dbo.UserSettlementBankAccounts(UserId)
    WHERE IsDefault = 1;
GO

-- ------------------------------------------------------------
-- DIRECT GOODS PAYMENTS (ENTERPRISE -> FARMER)
-- ------------------------------------------------------------
CREATE TABLE dbo.DirectGoodsPayments (
    GoodsPaymentId                 UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_DirectGoodsPayments PRIMARY KEY DEFAULT NEWID(),
    ContractId                     UNIQUEIDENTIFIER NOT NULL,
    PayerUserId                    UNIQUEIDENTIFIER NOT NULL,
    PayeeUserId                    UNIQUEIDENTIFIER NOT NULL,
    BankAccountId                  UNIQUEIDENTIFIER NOT NULL,
    InstallmentSequence            SMALLINT         NOT NULL
        CONSTRAINT DF_DirectGoodsPayments_Sequence DEFAULT 1,
    [Trigger]                      NVARCHAR(30)     NOT NULL,
    Amount                         DECIMAL(18,2)    NOT NULL,
    Currency                       CHAR(3)          NOT NULL
        CONSTRAINT DF_DirectGoodsPayments_Currency DEFAULT 'VND',
    TransferContent                NVARCHAR(100)    NOT NULL,
    RecipientBankCode              NVARCHAR(30)     NOT NULL,
    RecipientAccountHolder         NVARCHAR(150)    NOT NULL,
    RecipientMaskedAccountNumber   NVARCHAR(40)     NOT NULL,
    Status                         NVARCHAR(30)     NOT NULL
        CONSTRAINT DF_DirectGoodsPayments_Status DEFAULT 'planned',
    ConfirmationMethod             NVARCHAR(30)     NULL,
    IdempotencyKey                 NVARCHAR(128)    NOT NULL,
    DueAt                          DATETIME2        NULL,
    ExpiresAt                      DATETIME2        NULL,
    ConfirmedAt                    DATETIME2        NULL,
    ConfirmedBy                    UNIQUEIDENTIFIER NULL,
    ProviderTransactionId          NVARCHAR(80)     NULL,
    ProviderPayloadHash            CHAR(64)         NULL,
    CreatedAt                      DATETIME2        NOT NULL
        CONSTRAINT DF_DirectGoodsPayments_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt                      DATETIME2        NOT NULL
        CONSTRAINT DF_DirectGoodsPayments_UpdatedAt DEFAULT SYSUTCDATETIME(),

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

    CONSTRAINT CK_DirectGoodsPayments_Amount
        CHECK (Amount > 0),
    CONSTRAINT CK_DirectGoodsPayments_WholeVnd
        CHECK (Amount = ROUND(Amount, 0)),
    CONSTRAINT CK_DirectGoodsPayments_DifferentParties
        CHECK (PayerUserId <> PayeeUserId),
    CONSTRAINT CK_DirectGoodsPayments_Sequence
        CHECK (InstallmentSequence > 0),
    CONSTRAINT CK_DirectGoodsPayments_Trigger
        CHECK ([Trigger] IN ('contract_active','goods_accepted','manual')),
    CONSTRAINT CK_DirectGoodsPayments_Status CHECK (
        Status IN ('planned','payable','awaiting_payment','awaiting_confirmation',
                   'confirmed','expired','cancelled','disputed')
    ),
    CONSTRAINT CK_DirectGoodsPayments_ConfirmationMethod CHECK (
        ConfirmationMethod IS NULL OR
        ConfirmationMethod IN ('farmer_manual','provider_webhook','admin_review')
    ),
    CONSTRAINT CK_DirectGoodsPayments_ConfirmedMetadata CHECK (
        Status <> 'confirmed' OR
        (ConfirmedAt IS NOT NULL AND ConfirmationMethod IS NOT NULL
         AND (ConfirmationMethod = 'provider_webhook' OR ConfirmedBy IS NOT NULL))
    )
);

CREATE UNIQUE INDEX UX_DirectGoodsPayments_Contract_Sequence
    ON dbo.DirectGoodsPayments(ContractId, InstallmentSequence);
CREATE UNIQUE INDEX UX_DirectGoodsPayments_TransferContent
    ON dbo.DirectGoodsPayments(TransferContent);
CREATE UNIQUE INDEX UX_DirectGoodsPayments_IdempotencyKey
    ON dbo.DirectGoodsPayments(IdempotencyKey);
CREATE UNIQUE INDEX UX_DirectGoodsPayments_ProviderTransaction
    ON dbo.DirectGoodsPayments(ProviderTransactionId)
    WHERE ProviderTransactionId IS NOT NULL;
CREATE INDEX IX_DirectGoodsPayments_Payer_Status
    ON dbo.DirectGoodsPayments(PayerUserId, Status, CreatedAt);
CREATE INDEX IX_DirectGoodsPayments_Payee_Status
    ON dbo.DirectGoodsPayments(PayeeUserId, Status, CreatedAt);
CREATE INDEX IX_DirectGoodsPayments_Payer_Status_ConfirmedAt
    ON dbo.DirectGoodsPayments(PayerUserId, Status, ConfirmedAt)
    INCLUDE (Amount, ContractId);
CREATE INDEX IX_DirectGoodsPayments_Payee_Status_ConfirmedAt
    ON dbo.DirectGoodsPayments(PayeeUserId, Status, ConfirmedAt)
    INCLUDE (Amount, ContractId);
CREATE INDEX IX_DirectGoodsPayments_Contract_Status
    ON dbo.DirectGoodsPayments(ContractId, Status)
    INCLUDE (Amount, InstallmentSequence, ConfirmedAt);
GO

-- ------------------------------------------------------------
-- PLATFORM FEE ACCOUNTS
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeeAccounts (
    FeeAccountId        UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeeAccounts PRIMARY KEY DEFAULT NEWID(),
    UserId              UNIQUEIDENTIFIER NOT NULL,
    OutstandingAmount   DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeAccounts_Outstanding DEFAULT 0,
    OverdueAmount       DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeAccounts_Overdue DEFAULT 0,
    Status              NVARCHAR(30)     NOT NULL
        CONSTRAINT DF_PlatformFeeAccounts_Status DEFAULT 'good_standing',
    RestrictedAt        DATETIME2        NULL,
    LastCalculatedAt    DATETIME2        NULL,
    CreatedAt           DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeeAccounts_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeeAccounts_UpdatedAt DEFAULT SYSUTCDATETIME(),

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
GO

-- ------------------------------------------------------------
-- MONTHLY PLATFORM FEE STATEMENTS
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeeStatements (
    FeeStatementId          UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeeStatements PRIMARY KEY DEFAULT NEWID(),
    StatementCode           NVARCHAR(50)     NOT NULL,
    UserId                  UNIQUEIDENTIFIER NOT NULL,
    PeriodStart             DATE             NOT NULL,
    PeriodEnd               DATE             NOT NULL,
    OpeningBalanceSnapshot  DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_OpeningBalance DEFAULT 0,
    CurrentPeriodCharges    DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_Charges DEFAULT 0,
    CurrentPeriodCredits    DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_Credits DEFAULT 0,
    AmountDueSnapshot       DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_Due DEFAULT 0,
    AmountPaid              DECIMAL(18,2)    NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_Paid DEFAULT 0,
    Status                  NVARCHAR(30)     NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_Status DEFAULT 'draft',
    IssuedAt                DATETIME2        NULL,
    DueAt                   DATETIME2        NULL,
    PaidAt                  DATETIME2        NULL,
    CreatedAt               DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt               DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeeStatements_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_PlatformFeeStatements_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_PlatformFeeStatements_Period
        CHECK (PeriodEnd >= PeriodStart),
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
    ON dbo.PlatformFeeStatements(UserId, Status, DueAt)
    INCLUDE (AmountDueSnapshot, AmountPaid);
GO

-- ------------------------------------------------------------
-- PLATFORM FEE LEDGER
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeeLedgerEntries (
    FeeLedgerEntryId   UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeeLedgerEntries PRIMARY KEY DEFAULT NEWID(),
    UserId             UNIQUEIDENTIFIER NOT NULL,
    ContractId         UNIQUEIDENTIFIER NULL,
    GoodsPaymentId     UNIQUEIDENTIFIER NULL,
    FeePolicyId        UNIQUEIDENTIFIER NULL,
    FeeStatementId     UNIQUEIDENTIFIER NULL,
    EntryType          NVARCHAR(40)     NOT NULL,
    Direction          NVARCHAR(10)     NOT NULL,
    Amount             DECIMAL(18,2)    NOT NULL,
    FeeRateBps         INT              NULL,
    Status             NVARCHAR(20)     NOT NULL
        CONSTRAINT DF_PlatformFeeLedgerEntries_Status DEFAULT 'pending',
    IdempotencyKey     NVARCHAR(160)    NOT NULL,
    Description        NVARCHAR(500)    NULL,
    PostedAt           DATETIME2        NULL,
    VoidedAt           DATETIME2        NULL,
    CreatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeeLedgerEntries_CreatedAt DEFAULT SYSUTCDATETIME(),

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

    CONSTRAINT CK_PlatformFeeLedgerEntries_Amount
        CHECK (Amount > 0),
    CONSTRAINT CK_PlatformFeeLedgerEntries_FeeRate
        CHECK (FeeRateBps IS NULL OR FeeRateBps BETWEEN 0 AND 10000),
    CONSTRAINT CK_PlatformFeeLedgerEntries_Type CHECK (
        EntryType IN ('buyer_transaction_fee','seller_transaction_fee','payment',
                      'discount','waiver','adjustment','refund')
    ),
    CONSTRAINT CK_PlatformFeeLedgerEntries_Direction
        CHECK (Direction IN ('debit','credit')),
    CONSTRAINT CK_PlatformFeeLedgerEntries_Status
        CHECK (Status IN ('pending','posted','voided'))
);

CREATE UNIQUE INDEX UX_PlatformFeeLedgerEntries_IdempotencyKey
    ON dbo.PlatformFeeLedgerEntries(IdempotencyKey);
CREATE INDEX IX_PlatformFeeLedgerEntries_User_Status_CreatedAt
    ON dbo.PlatformFeeLedgerEntries(UserId, Status, CreatedAt);
CREATE INDEX IX_PlatformFeeLedgerEntries_Statement
    ON dbo.PlatformFeeLedgerEntries(FeeStatementId);
CREATE INDEX IX_PlatformFeeLedgerEntries_Contract
    ON dbo.PlatformFeeLedgerEntries(ContractId);
CREATE INDEX IX_PlatformFeeLedgerEntries_GoodsPayment
    ON dbo.PlatformFeeLedgerEntries(GoodsPaymentId, Status);
CREATE INDEX IX_PlatformFeeLedgerEntries_User_Status_PostedAt
    ON dbo.PlatformFeeLedgerEntries(UserId, Status, PostedAt)
    INCLUDE (Direction, Amount, EntryType, FeeStatementId);
GO

-- ------------------------------------------------------------
-- PLATFORM FEE PAYMENTS
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeePayments (
    FeePaymentId       UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeePayments PRIMARY KEY DEFAULT NEWID(),
    UserId             UNIQUEIDENTIFIER NOT NULL,
    FeeStatementId     UNIQUEIDENTIFIER NULL,
    OrderCode          NVARCHAR(50)     NOT NULL,
    IdempotencyKey     NVARCHAR(128)    NOT NULL,
    Amount             DECIMAL(18,2)    NOT NULL,
    Currency           CHAR(3)          NOT NULL
        CONSTRAINT DF_PlatformFeePayments_Currency DEFAULT 'VND',
    Provider           NVARCHAR(30)     NOT NULL,
    ProviderPaymentId  NVARCHAR(150)    NULL,
    TransferContent    NVARCHAR(100)    NOT NULL,
    PaymentUrl         NVARCHAR(1000)   NULL,
    QrPayload          NVARCHAR(2000)   NULL,
    Status             NVARCHAR(20)     NOT NULL
        CONSTRAINT DF_PlatformFeePayments_Status DEFAULT 'pending',
    ExpiresAt          DATETIME2        NULL,
    PaidAt             DATETIME2        NULL,
    CreatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePayments_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePayments_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_PlatformFeePayments_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_PlatformFeePayments_Statements
        FOREIGN KEY (FeeStatementId) REFERENCES dbo.PlatformFeeStatements(FeeStatementId),
    CONSTRAINT CK_PlatformFeePayments_Amount
        CHECK (Amount > 0),
    CONSTRAINT CK_PlatformFeePayments_Status CHECK (
        Status IN ('pending','processing','paid','failed','expired','cancelled','amount_mismatch')
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
GO

-- ------------------------------------------------------------
-- PROVIDER WEBHOOK / PAYMENT EVENTS
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeePaymentEvents (
    FeePaymentEventId  UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeePaymentEvents PRIMARY KEY DEFAULT NEWID(),
    FeePaymentId       UNIQUEIDENTIFIER NOT NULL,
    Provider           NVARCHAR(30)     NOT NULL,
    ProviderEventId    NVARCHAR(150)    NULL,
    EventType          NVARCHAR(60)     NOT NULL,
    PayloadHash        CHAR(64)         NOT NULL,
    SanitizedPayload   NVARCHAR(MAX)    NULL,
    OccurredAt         DATETIME2        NULL,
    CreatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePaymentEvents_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_PlatformFeePaymentEvents_Payments
        FOREIGN KEY (FeePaymentId) REFERENCES dbo.PlatformFeePayments(FeePaymentId)
);

CREATE UNIQUE INDEX UX_PlatformFeePaymentEvents_ProviderEvent
    ON dbo.PlatformFeePaymentEvents(Provider, ProviderEventId)
    WHERE ProviderEventId IS NOT NULL;
CREATE INDEX IX_PlatformFeePaymentEvents_Payment_CreatedAt
    ON dbo.PlatformFeePaymentEvents(FeePaymentId, CreatedAt);
GO

-- ------------------------------------------------------------
-- IMMUTABLE CONTRACT FEE SNAPSHOT
-- ------------------------------------------------------------
CREATE TABLE dbo.ContractFeeTerms (
    ContractFeeTermsId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_ContractFeeTerms PRIMARY KEY DEFAULT NEWID(),
    ContractId         UNIQUEIDENTIFIER NOT NULL,
    FeePolicyId        UNIQUEIDENTIFIER NOT NULL,
    BuyerFeeBps        INT              NOT NULL,
    SellerFeeBps       INT              NOT NULL,
    Currency           CHAR(3)          NOT NULL
        CONSTRAINT DF_ContractFeeTerms_Currency DEFAULT 'VND',
    SnapshottedAt      DATETIME2        NOT NULL,
    CreatedAt          DATETIME2        NOT NULL
        CONSTRAINT DF_ContractFeeTerms_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_ContractFeeTerms_Contracts
        FOREIGN KEY (ContractId) REFERENCES dbo.Contracts(ContractId),
    CONSTRAINT FK_ContractFeeTerms_Policies
        FOREIGN KEY (FeePolicyId) REFERENCES dbo.PlatformFeePolicies(FeePolicyId),
    CONSTRAINT CK_ContractFeeTerms_BuyerFeeBps
        CHECK (BuyerFeeBps BETWEEN 0 AND 10000),
    CONSTRAINT CK_ContractFeeTerms_SellerFeeBps
        CHECK (SellerFeeBps BETWEEN 0 AND 10000),
    CONSTRAINT CK_ContractFeeTerms_TotalFee
        CHECK (BuyerFeeBps + SellerFeeBps < 10000)
);

CREATE UNIQUE INDEX UX_ContractFeeTerms_Contract
    ON dbo.ContractFeeTerms(ContractId);
CREATE INDEX IX_ContractFeeTerms_Policy
    ON dbo.ContractFeeTerms(FeePolicyId);
GO

-- ------------------------------------------------------------
-- FEE PAYMENT APPLICATIONS (PAYMENT -> LEDGER CHARGES)
-- ------------------------------------------------------------
CREATE TABLE dbo.PlatformFeePaymentApplications (
    FeePaymentApplicationId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT PK_PlatformFeePaymentApplications PRIMARY KEY DEFAULT NEWID(),
    FeePaymentId            UNIQUEIDENTIFIER NOT NULL,
    FeeLedgerEntryId        UNIQUEIDENTIFIER NOT NULL,
    FeeStatementId          UNIQUEIDENTIFIER NULL,
    Amount                  DECIMAL(18,2)    NOT NULL,
    CreatedAt               DATETIME2        NOT NULL
        CONSTRAINT DF_PlatformFeePaymentApplications_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_PlatformFeePaymentApplications_Payment
        FOREIGN KEY (FeePaymentId) REFERENCES dbo.PlatformFeePayments(FeePaymentId),
    CONSTRAINT FK_PlatformFeePaymentApplications_Ledger
        FOREIGN KEY (FeeLedgerEntryId) REFERENCES dbo.PlatformFeeLedgerEntries(FeeLedgerEntryId),
    CONSTRAINT FK_PlatformFeePaymentApplications_Statement
        FOREIGN KEY (FeeStatementId) REFERENCES dbo.PlatformFeeStatements(FeeStatementId),
    CONSTRAINT CK_PlatformFeePaymentApplications_Amount
        CHECK (Amount > 0)
);

CREATE UNIQUE INDEX UX_PlatformFeePaymentApplications_Payment_Ledger
    ON dbo.PlatformFeePaymentApplications(FeePaymentId, FeeLedgerEntryId);
CREATE INDEX IX_PlatformFeePaymentApplications_Ledger
    ON dbo.PlatformFeePaymentApplications(FeeLedgerEntryId);
CREATE INDEX IX_PlatformFeePaymentApplications_Statement
    ON dbo.PlatformFeePaymentApplications(FeeStatementId);
GO

-- ============================================================
-- FINAL SCHEMA NOTES
-- This bootstrap is the only database schema source needed for a clean install.
-- It contains no legacy custodial-payment tables and requires no data backfill.
-- ============================================================

-- ============================================================
-- FAIL-FAST FINAL SCHEMA VALIDATION
-- Stop immediately if a required direct-payment object was not created.
-- ============================================================
IF OBJECT_ID('dbo.PlatformFeePolicies', 'U') IS NULL
   OR OBJECT_ID('dbo.UserSettlementBankAccounts', 'U') IS NULL
   OR OBJECT_ID('dbo.DirectGoodsPayments', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeeAccounts', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeeStatements', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeeLedgerEntries', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeePayments', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeePaymentEvents', 'U') IS NULL
   OR OBJECT_ID('dbo.ContractFeeTerms', 'U') IS NULL
   OR OBJECT_ID('dbo.PlatformFeePaymentApplications', 'U') IS NULL
BEGIN
    THROW 50010, N'Direct-payment schema bootstrap failed: one or more required tables were not created. Review the first SQL error above.', 1;
END;
GO

IF COL_LENGTH('dbo.Contracts', 'PaymentFlow') IS NULL
   OR COL_LENGTH('dbo.DirectGoodsPayments', 'Trigger') IS NULL
BEGIN
    THROW 50011, N'Direct Payment V2 schema bootstrap failed: required columns Contracts.PaymentFlow / DirectGoodsPayments.Trigger are missing.', 1;
END;
GO

-- ============================================================
-- VALIDATION SUMMARY
-- ============================================================
PRINT N'PreOnic local database bootstrap completed.';
PRINT N'Expected application tables: 27.';
PRINT N'No migration command is required after this bootstrap.';
PRINT N'Database: preonic_v2 | SQL Server local configuration should use DB_DATABASE=preonic_v2.';
GO
