import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lưu tỉ lệ bao tiêu tối thiểu Farmer chọn ở form đăng sản phẩm.
 * Dữ liệu cũ được backfill 50% vì đây là giá trị mặc định của UI trước Fix 06.
 */
export class AddCoverageRateToProducts1786670000000 implements MigrationInterface {
  name = 'AddCoverageRateToProducts1786670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Products', 'CoverageRate') IS NULL
      BEGIN
        ALTER TABLE dbo.Products
        ADD CoverageRate tinyint NOT NULL
          CONSTRAINT DF_Products_CoverageRate DEFAULT 50 WITH VALUES;
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Products_CoverageRate'
          AND parent_object_id = OBJECT_ID('dbo.Products')
      )
      BEGIN
        ALTER TABLE dbo.Products WITH CHECK
        ADD CONSTRAINT CK_Products_CoverageRate
        CHECK (CoverageRate >= 0 AND CoverageRate <= 100);

        ALTER TABLE dbo.Products
        CHECK CONSTRAINT CK_Products_CoverageRate;
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = 'CK_Products_CoverageRate'
          AND parent_object_id = OBJECT_ID('dbo.Products')
      )
      ALTER TABLE dbo.Products DROP CONSTRAINT CK_Products_CoverageRate;
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE name = 'DF_Products_CoverageRate'
          AND parent_object_id = OBJECT_ID('dbo.Products')
      )
      ALTER TABLE dbo.Products DROP CONSTRAINT DF_Products_CoverageRate;
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Products', 'CoverageRate') IS NOT NULL
      ALTER TABLE dbo.Products DROP COLUMN CoverageRate;
    `);
  }
}
