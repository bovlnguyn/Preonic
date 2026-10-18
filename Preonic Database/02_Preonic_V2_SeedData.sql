USE [preonic_v2];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/*
  Optional demo data for the canonical direct-settlement schema.
  Accounts use password: password
  The demo catalog contains 10 products with public image URLs and 10 contracts
  between the demo farmer and enterprise. It creates no bank account or money
  movement. Pending contracts can continue through the real signing flow after
  the farmer registers an encrypted settlement bank account in the application.
*/

IF OBJECT_ID('dbo.Users', 'U') IS NULL
   OR OBJECT_ID('dbo.Products', 'U') IS NULL
   OR OBJECT_ID('dbo.DirectGoodsPayments', 'U') IS NULL
   OR COL_LENGTH('dbo.Contracts', 'PaymentFlow') IS NULL
BEGIN
  THROW 50020, N'PreOnic schema chưa sẵn sàng. Hãy chạy 01_Preonic_V2_CreateDatabase.sql trước.', 1;
END;
GO

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @FarmerId UNIQUEIDENTIFIER = '11111111-1111-4111-8111-111111111111';
  DECLARE @EnterpriseId UNIQUEIDENTIFIER = '22222222-2222-4222-8222-222222222222';
  DECLARE @AdminId UNIQUEIDENTIFIER = '33333333-3333-4333-8333-333333333333';
  DECLARE @PasswordHash NVARCHAR(255) = N'$2a$12$OZ85zJqH8aqwJbQH/XkiceRN/JZs7CkUu7A.nCptxC5F7AlTRdbT.';

  IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @FarmerId)
    INSERT dbo.Users (UserId, Email, Password, Role, AuthProvider, FirstName, LastName, Phone, IsActive, IsVerified, Province, District, Address)
    VALUES (@FarmerId, N'farmer.demo@preonic.vn', @PasswordHash, N'farmer', N'local', N'Nguyễn Văn', N'An', N'0901000001', 1, 1, N'Đồng Tháp', N'Cao Lãnh', N'123 Đường Nông Nghiệp');

  IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @EnterpriseId)
    INSERT dbo.Users (UserId, Email, Password, Role, AuthProvider, FirstName, LastName, Phone, IsActive, IsVerified, Province, District, Address)
    VALUES (@EnterpriseId, N'enterprise.demo@preonic.vn', @PasswordHash, N'enterprise', N'local', N'Trần Minh', N'Khang', N'0901000002', 1, 1, N'TP. Hồ Chí Minh', N'Quận 1', N'45 Nguyễn Huệ');

  IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @AdminId)
    INSERT dbo.Users (UserId, Email, Password, Role, AuthProvider, FirstName, LastName, Phone, IsActive, IsVerified)
    VALUES (@AdminId, N'admin.demo@preonic.vn', @PasswordHash, N'admin', N'local', N'Quản trị', N'PreOnic', N'0901000003', 1, 1);

  DECLARE @DemoProducts TABLE (
    ProductId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(255) NOT NULL,
    [Location] NVARCHAR(255) NULL,
    Farm NVARCHAR(255) NULL,
    Image NVARCHAR(500) NULL,
    Images NVARCHAR(MAX) NULL,
    PriceMin DECIMAL(18,2) NULL,
    PriceMax DECIMAL(18,2) NULL,
    Unit NVARCHAR(50) NULL,
    PriceUnit NVARCHAR(50) NULL,
    Variety NVARCHAR(200) NULL,
    PlantDate DATE NULL,
    ExpectedDate DATE NULL,
    Progress DECIMAL(5,2) NULL,
    Remaining DECIMAL(18,2) NULL,
    TotalQuantity DECIMAL(18,2) NULL,
    Category NVARCHAR(30) NOT NULL,
    Region NVARCHAR(10) NOT NULL,
    [Type] NVARCHAR(20) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    CoverageRate TINYINT NOT NULL
  );

  INSERT INTO @DemoProducts
    (ProductId, Name, [Location], Farm, Image, Images, PriceMin, PriceMax,
     Unit, PriceUnit, Variety, PlantDate, ExpectedDate, Progress, Remaining,
     TotalQuantity, Category, Region, [Type], [Description], CoverageRate)
  VALUES
    ('10000000-0000-4000-8000-000000000001', N'Xoài Cát Chu', N'Cao Lãnh, Đồng Tháp', N'Vườn An',
     N'https://images.unsplash.com/photo-1553279768-865429fa0078?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1553279768-865429fa0078?w=1200&q=82&auto=format&fit=crop"]',
     28000, 34000, N'kg', N'kg', N'Cát Chu', DATEADD(DAY, -90, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 35, CAST(SYSUTCDATETIME() AS DATE)), 72, 5000, 5000,
     N'fruit', N'south', N'fresh', N'Xoài canh tác theo tiêu chuẩn an toàn, dự kiến thu hoạch đồng đều.', 70),

    ('10000000-0000-4000-8000-000000000002', N'Lúa ST25', N'Cao Lãnh, Đồng Tháp', N'Cánh đồng An Phú',
     N'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=1200&q=82&auto=format&fit=crop"]',
     15000, 18000, N'kg', N'kg', N'ST25', DATEADD(DAY, -75, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 28, CAST(SYSUTCDATETIME() AS DATE)), 78, 12000, 12000,
     N'rice', N'south', N'dried', N'Lúa ST25 truy xuất được nguồn gốc, độ ẩm và tạp chất được kiểm soát.', 60),

    ('10000000-0000-4000-8000-000000000003', N'Cà chua beef', N'Đà Lạt, Lâm Đồng', N'Nhà kính An Phú',
     N'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1200&q=82&auto=format&fit=crop"]',
     24000, 30000, N'kg', N'kg', N'Beef', DATEADD(DAY, -55, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 18, CAST(SYSUTCDATETIME() AS DATE)), 82, 3200, 3200,
     N'vegetable', N'central', N'fresh', N'Cà chua trồng nhà kính, trái chắc, phù hợp chuỗi nhà hàng và bán lẻ.', 85),

    ('10000000-0000-4000-8000-000000000004', N'Dưa leo baby', N'Đơn Dương, Lâm Đồng', N'Vườn rau An Phú',
     N'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=1200&q=82&auto=format&fit=crop"]',
     18000, 23000, N'kg', N'kg', N'Baby', DATEADD(DAY, -35, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 12, CAST(SYSUTCDATETIME() AS DATE)), 88, 2600, 2600,
     N'vegetable', N'central', N'fresh', N'Dưa leo baby giòn, đồng đều kích thước và thu hoạch theo đơn đặt hàng.', 75),

    ('10000000-0000-4000-8000-000000000005', N'Cà phê Robusta', N'Buôn Ma Thuột, Đắk Lắk', N'Rẫy cà phê An Phú',
     N'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=82&auto=format&fit=crop"]',
     98000, 112000, N'kg', N'kg', N'Robusta', DATEADD(DAY, -180, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 65, CAST(SYSUTCDATETIME() AS DATE)), 64, 8500, 8500,
     N'coffee', N'central', N'dried', N'Cà phê Robusta sơ chế khô, hạt sàng tuyển và có hồ sơ vùng trồng.', 80),

    ('10000000-0000-4000-8000-000000000006', N'Chè xanh Bảo Lộc', N'Bảo Lộc, Lâm Đồng', N'Đồi chè An Phú',
     N'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=1200&q=82&auto=format&fit=crop"]',
     42000, 52000, N'kg', N'kg', N'Chè xanh', DATEADD(DAY, -40, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 20, CAST(SYSUTCDATETIME() AS DATE)), 76, 3000, 4000,
     N'tea', N'central', N'fresh', N'Búp chè một tôm hai lá, thu hái thủ công và giao trong ngày.', 70),

    ('10000000-0000-4000-8000-000000000007', N'Bắp ngọt', N'Châu Thành, Đồng Tháp', N'Cánh đồng An Phú',
     N'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=1200&q=82&auto=format&fit=crop"]',
     9000, 12000, N'kg', N'kg', N'Bắp Mỹ', DATEADD(DAY, -48, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 22, CAST(SYSUTCDATETIME() AS DATE)), 70, 9000, 9000,
     N'grain', N'south', N'fresh', N'Bắp ngọt thu hoạch đúng độ già, thích hợp chế biến và phân phối siêu thị.', 65),

    ('10000000-0000-4000-8000-000000000008', N'Bơ 034', N'Bảo Lâm, Lâm Đồng', N'Vườn bơ An Phú',
     N'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=1200&q=82&auto=format&fit=crop"]',
     45000, 60000, N'kg', N'kg', N'034', DATEADD(DAY, -120, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 50, CAST(SYSUTCDATETIME() AS DATE)), 68, 4500, 4500,
     N'fruit', N'central', N'fresh', N'Bơ 034 cơm vàng, dẻo, được phân loại theo kích cỡ trước khi giao.', 75),

    ('10000000-0000-4000-8000-000000000009', N'Cam sành', N'Lai Vung, Đồng Tháp', N'Vườn cam An Phú',
     N'https://images.unsplash.com/photo-1547514701-42782101795e?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1547514701-42782101795e?w=1200&q=82&auto=format&fit=crop"]',
     22000, 29000, N'kg', N'kg', N'Cam sành', DATEADD(DAY, -100, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 42, CAST(SYSUTCDATETIME() AS DATE)), 74, 6800, 6800,
     N'fruit', N'south', N'fresh', N'Cam sành vị đậm, trái đồng đều và có thể đóng gói theo quy cách doanh nghiệp.', 70),

    ('10000000-0000-4000-8000-000000000010', N'Chuối già Nam Mỹ', N'Tân Hồng, Đồng Tháp', N'Vườn chuối An Phú',
     N'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=1200&q=82&auto=format&fit=crop',
     N'["https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=1200&q=82&auto=format&fit=crop"]',
     13000, 17000, N'kg', N'kg', N'Già Nam Mỹ', DATEADD(DAY, -115, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(DAY, 38, CAST(SYSUTCDATETIME() AS DATE)), 79, 15000, 15000,
     N'fruit', N'south', N'fresh', N'Chuối trồng tập trung, buồng đồng đều, phù hợp thu mua số lượng lớn.', 80);

  INSERT dbo.Products
    (ProductId, Name, [Location], Farm, Image, Images, PriceMin, PriceMax,
     Unit, PriceUnit, Variety, PlantDate, ExpectedDate, Progress, Remaining,
     TotalQuantity, Category, Region, [Type], [Description], SellerUserId,
     SellerName, CreatedBy, IsActive, CoverageRate)
  SELECT
    src.ProductId, src.Name, src.[Location], src.Farm, src.Image,
    src.Images, src.PriceMin, src.PriceMax, src.Unit, src.PriceUnit,
    src.Variety, src.PlantDate, src.ExpectedDate, src.Progress,
    src.Remaining, src.TotalQuantity, src.Category, src.Region,
    src.[Type], src.[Description], @FarmerId, N'Nguyễn Văn An', @FarmerId,
    1, src.CoverageRate
  FROM @DemoProducts src
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Products existing WHERE existing.ProductId = src.ProductId
  );

  DECLARE @DemoContracts TABLE (
    ContractId UNIQUEIDENTIFIER NOT NULL,
    ContractCode NVARCHAR(20) NOT NULL,
    ProductId UNIQUEIDENTIFIER NOT NULL,
    Quantity DECIMAL(18,2) NOT NULL,
    PricePerUnit DECIMAL(18,2) NOT NULL,
    PaymentTerms NVARCHAR(20) NOT NULL,
    FirstPaymentPercentage DECIMAL(5,2) NOT NULL,
    DeliveryInDays INT NOT NULL,
    [Status] NVARCHAR(30) NOT NULL,
    CancelReason NVARCHAR(500) NULL,
    CreatedDaysAgo INT NOT NULL
  );

  INSERT INTO @DemoContracts
    (ContractId, ContractCode, ProductId, Quantity, PricePerUnit, PaymentTerms,
     FirstPaymentPercentage, DeliveryInDays, [Status], CancelReason, CreatedDaysAgo)
  VALUES
    ('20000000-0000-4000-8000-000000000001', N'PRE-DEMO-001', '10000000-0000-4000-8000-000000000001', 1200, 31000, N'30_70',        30, 30, N'pending',   NULL, 12),
    ('20000000-0000-4000-8000-000000000002', N'PRE-DEMO-002', '10000000-0000-4000-8000-000000000002', 3500, 16500, N'50_50',        50, 40, N'pending',   NULL, 11),
    ('20000000-0000-4000-8000-000000000003', N'PRE-DEMO-003', '10000000-0000-4000-8000-000000000003',  800, 27000, N'100_delivery',   0, 18, N'pending',   NULL, 10),
    ('20000000-0000-4000-8000-000000000004', N'PRE-DEMO-004', '10000000-0000-4000-8000-000000000004',  600, 20500, N'100_upfront',  100, 16, N'pending',   NULL,  9),
    ('20000000-0000-4000-8000-000000000005', N'PRE-DEMO-005', '10000000-0000-4000-8000-000000000005', 1500, 105000,N'custom',        20, 55, N'pending',   NULL,  8),
    ('20000000-0000-4000-8000-000000000006', N'PRE-DEMO-006', '10000000-0000-4000-8000-000000000006', 1000, 47000, N'100_delivery',    0, 25, N'active',    NULL,  7),
    ('20000000-0000-4000-8000-000000000007', N'PRE-DEMO-007', '10000000-0000-4000-8000-000000000007', 2200, 10500, N'30_70',         30, 28, N'cancelled', N'Nông dân chưa thể đáp ứng lịch giao hàng đề xuất.', 6),
    ('20000000-0000-4000-8000-000000000008', N'PRE-DEMO-008', '10000000-0000-4000-8000-000000000008',  900, 52000, N'100_delivery',    0, 45, N'cancelled', N'Doanh nghiệp thay đổi kế hoạch thu mua.', 5),
    ('20000000-0000-4000-8000-000000000009', N'PRE-DEMO-009', '10000000-0000-4000-8000-000000000009', 1100, 25500, N'50_50',         50, 36, N'draft',     NULL,  3),
    ('20000000-0000-4000-8000-000000000010', N'PRE-DEMO-010', '10000000-0000-4000-8000-000000000010', 3000, 15000, N'30_70',         30, 32, N'draft',     NULL,  2);

  INSERT dbo.Contracts
    (ContractId, ContractCode, ProductId, FarmerId, EnterpriseId, FarmerName,
     EnterpriseName, ProductName, Quantity, Unit, PricePerUnit, TotalValue,
     FirstPaymentPercentage, PaymentFlow, PaymentTerms, DeliveryDate,
     DeliveryAddress, Notes, FarmLocation, [Status], SignedByFarmer,
     SignedByEnterprise, SignedAt, CancelledAt, CancelReason, InsuranceEnabled,
     InsuranceStatus, PaidAmount, RemainingAmount, DeliveryStatus,
     CreatedBy, UpdatedBy, CreatedAt, UpdatedAt)
  SELECT
    src.ContractId,
    src.ContractCode,
    src.ProductId,
    @FarmerId,
    @EnterpriseId,
    N'Nguyễn Văn An',
    N'Trần Minh Khang',
    product.Name,
    src.Quantity,
    product.Unit,
    src.PricePerUnit,
    src.Quantity * src.PricePerUnit,
    src.FirstPaymentPercentage,
    N'direct_v2',
    src.PaymentTerms,
    DATEADD(DAY, src.DeliveryInDays, CAST(SYSUTCDATETIME() AS DATE)),
    N'Kho trung chuyển PreOnic, Quận 12, TP. Hồ Chí Minh',
    N'Dữ liệu hợp đồng mẫu phục vụ kiểm thử giao diện và quy trình ký.',
    product.Location,
    src.[Status],
    CASE WHEN src.[Status] = N'active' THEN 1 ELSE 0 END,
    CASE WHEN src.[Status] = N'active' THEN 1 ELSE 0 END,
    CASE WHEN src.[Status] = N'active' THEN DATEADD(DAY, -5, SYSUTCDATETIME()) ELSE NULL END,
    CASE WHEN src.[Status] = N'cancelled' THEN DATEADD(DAY, -1, SYSUTCDATETIME()) ELSE NULL END,
    src.CancelReason,
    0,
    N'none',
    0,
    src.Quantity * src.PricePerUnit,
    N'pending',
    @EnterpriseId,
    @EnterpriseId,
    DATEADD(DAY, -1 * src.CreatedDaysAgo, SYSUTCDATETIME()),
    DATEADD(DAY, -1 * src.CreatedDaysAgo, SYSUTCDATETIME())
  FROM @DemoContracts src
  INNER JOIN dbo.Products product ON product.ProductId = src.ProductId
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Contracts existing WHERE existing.ContractId = src.ContractId
  );

  -- Contract active dùng 100% khi nhận hàng nên chưa cần tạo khoản thanh toán.
  -- Snapshot chính sách phí vẫn được lưu đúng như luồng kích hoạt hợp đồng thật.
  INSERT dbo.ContractFeeTerms
    (ContractFeeTermsId, ContractId, FeePolicyId, BuyerFeeBps, SellerFeeBps,
     Currency, SnapshottedAt, CreatedAt)
  SELECT
    '30000000-0000-4000-8000-000000000001',
    c.ContractId,
    fp.FeePolicyId,
    fp.BuyerFeeBps,
    fp.SellerFeeBps,
    fp.Currency,
    c.SignedAt,
    c.SignedAt
  FROM dbo.Contracts c
  CROSS APPLY (
    SELECT TOP (1)
      FeePolicyId, BuyerFeeBps, SellerFeeBps, Currency
    FROM dbo.PlatformFeePolicies
    WHERE IsActive = 1
      AND EffectiveFrom <= SYSUTCDATETIME()
      AND (EffectiveTo IS NULL OR EffectiveTo > SYSUTCDATETIME())
    ORDER BY EffectiveFrom DESC
  ) fp
  WHERE c.ContractId = '20000000-0000-4000-8000-000000000006'
    AND c.[Status] = N'active'
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.ContractFeeTerms terms
      WHERE terms.ContractId = c.ContractId
    );

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO

SELECT Email, Role, IsActive, IsVerified
FROM dbo.Users
WHERE Email IN (N'farmer.demo@preonic.vn', N'enterprise.demo@preonic.vn', N'admin.demo@preonic.vn')
ORDER BY Role;
SELECT [Status], COUNT(*) AS ContractCount
FROM dbo.Contracts
WHERE ContractCode LIKE N'PRE-DEMO-%'
GROUP BY [Status]
ORDER BY [Status];

PRINT N'PreOnic demo seed completed: 3 users, 10 products, 10 contracts, 0 financial transactions.';
GO
