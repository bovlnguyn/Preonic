import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemLogs1785800000000 implements MigrationInterface {
  name = 'CreateSystemLogs1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.SystemLogs', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.SystemLogs (
          LogId       INT IDENTITY(1,1) PRIMARY KEY,
          Category    NVARCHAR(30) NOT NULL,
          Action      NVARCHAR(60) NOT NULL,
          Level       NVARCHAR(10) NOT NULL CONSTRAINT DF_SystemLogs_Level DEFAULT 'info',
          UserId      UNIQUEIDENTIFIER NULL,
          TargetType  NVARCHAR(30) NULL,
          TargetId    NVARCHAR(100) NULL,
          Message     NVARCHAR(1000) NOT NULL,
          Metadata    NVARCHAR(MAX) NULL,
          StackTrace  NVARCHAR(MAX) NULL,
          IpAddress   NVARCHAR(45) NULL,
          CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_SystemLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
          CONSTRAINT FK_SystemLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
        )

        CREATE INDEX IX_SystemLogs_Category_CreatedAt ON dbo.SystemLogs (Category, CreatedAt)
        CREATE INDEX IX_SystemLogs_Level_CreatedAt ON dbo.SystemLogs (Level, CreatedAt)
        CREATE INDEX IX_SystemLogs_UserId_CreatedAt ON dbo.SystemLogs (UserId, CreatedAt)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('dbo.SystemLogs', 'U') IS NOT NULL
      BEGIN
        DROP TABLE dbo.SystemLogs
      END
    `);
  }
}
