import { MigrationInterface, QueryRunner } from 'typeorm';

type CheckConstraintSnapshot = {
  name: string;
  definition: string;
};

/**
 * PartnerRatings.OverallRating truoc day la tinyint trong khi service tinh
 * trung binh 3 tieu chi (vd 4.33). Chuyen sang decimal(3,2), sau do tinh lai
 * du lieu cu tu cac cot tieu chi goc va dong bo ReputationScore/TotalRatings.
 *
 * SQL Server khong cho ALTER COLUMN khi CHECK CONSTRAINT dang tham chieu cot.
 * Migration nay tam thoi go cac CHECK CONSTRAINT lien quan, doi kieu cot, sau
 * do tao lai dung chinh definition cu de khong lam mat business rule trong DB.
 */
export class FixPartnerRatingPrecision1786660000000 implements MigrationInterface {
  name = 'FixPartnerRatingPrecision1786660000000';

  private quoteIdentifier(value: string): string {
    return `[${String(value).replace(/]/g, ']]')}]`;
  }

  private async getOverallRatingCheckConstraints(
    queryRunner: QueryRunner
  ): Promise<CheckConstraintSnapshot[]> {
    const rows = await queryRunner.query(`
      DECLARE @TableId INT = OBJECT_ID('dbo.PartnerRatings');
      DECLARE @ColumnId INT = COLUMNPROPERTY(@TableId, 'OverallRating', 'ColumnId');

      SELECT
        cc.name,
        cc.definition
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = @TableId
        AND (
          cc.parent_column_id = @ColumnId
          OR cc.definition LIKE '%OverallRating%'
        );
    `);

    return Array.isArray(rows)
      ? rows.filter((row) => row?.name && row?.definition)
      : [];
  }

  private async dropCheckConstraints(
    queryRunner: QueryRunner,
    constraints: CheckConstraintSnapshot[]
  ): Promise<void> {
    for (const constraint of constraints) {
      await queryRunner.query(`
        ALTER TABLE dbo.PartnerRatings
        DROP CONSTRAINT ${this.quoteIdentifier(constraint.name)};
      `);
    }
  }

  private async restoreCheckConstraints(
    queryRunner: QueryRunner,
    constraints: CheckConstraintSnapshot[]
  ): Promise<void> {
    for (const constraint of constraints) {
      await queryRunner.query(`
        ALTER TABLE dbo.PartnerRatings WITH CHECK
        ADD CONSTRAINT ${this.quoteIdentifier(constraint.name)}
        CHECK ${constraint.definition};

        ALTER TABLE dbo.PartnerRatings
        CHECK CONSTRAINT ${this.quoteIdentifier(constraint.name)};
      `);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const checkConstraints = await this.getOverallRatingCheckConstraints(queryRunner);
    await this.dropCheckConstraints(queryRunner, checkConstraints);

    await queryRunner.query(`
      ALTER TABLE dbo.PartnerRatings
      ALTER COLUMN OverallRating decimal(3,2) NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE dbo.PartnerRatings
      SET OverallRating = CAST(
        CASE
          WHEN Transparency IS NOT NULL
            AND PaymentPunctuality IS NOT NULL
            AND Coordination IS NOT NULL
          THEN (CAST(Transparency AS decimal(10,2))
              + CAST(PaymentPunctuality AS decimal(10,2))
              + CAST(Coordination AS decimal(10,2))) / 3.0
          WHEN Quality IS NOT NULL
            AND OnTimeDelivery IS NOT NULL
            AND CommittedVolume IS NOT NULL
          THEN (CAST(Quality AS decimal(10,2))
              + CAST(OnTimeDelivery AS decimal(10,2))
              + CAST(CommittedVolume AS decimal(10,2))) / 3.0
          ELSE CAST(OverallRating AS decimal(10,2))
        END
        AS decimal(3,2)
      );
    `);

    // Khong co rating = chua co uy tin, khong mac dinh 5 sao.
    await queryRunner.query(`
      UPDATE dbo.Users
      SET ReputationScore = 0,
          TotalRatings = 0;
    `);

    await queryRunner.query(`
      ;WITH RatingSummary AS (
        SELECT
          RevieweeId,
          CAST(AVG(CAST(OverallRating AS decimal(10,4))) AS decimal(3,2)) AS ReputationScore,
          COUNT(*) AS TotalRatings
        FROM dbo.PartnerRatings
        GROUP BY RevieweeId
      )
      UPDATE u
      SET
        u.ReputationScore = rs.ReputationScore,
        u.TotalRatings = rs.TotalRatings
      FROM dbo.Users u
      INNER JOIN RatingSummary rs ON rs.RevieweeId = u.UserId;
    `);

    // Snapshot cu tren Product duoc backfill de cac API/FE legacy khong hien 5 sao gia.
    await queryRunner.query(`
      UPDATE p
      SET p.SellerRating = CASE WHEN u.TotalRatings > 0 THEN u.ReputationScore ELSE NULL END
      FROM dbo.Products p
      INNER JOIN dbo.Users u ON u.UserId = COALESCE(p.SellerUserId, p.CreatedBy);
    `);

    await this.restoreCheckConstraints(queryRunner, checkConstraints);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const checkConstraints = await this.getOverallRatingCheckConstraints(queryRunner);
    await this.dropCheckConstraints(queryRunner, checkConstraints);

    // Down migration mat do chinh xac thap phan vi schema cu chi luu tinyint.
    await queryRunner.query(`
      UPDATE dbo.PartnerRatings
      SET OverallRating = ROUND(OverallRating, 0);
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.PartnerRatings
      ALTER COLUMN OverallRating tinyint NOT NULL;
    `);

    await this.restoreCheckConstraints(queryRunner, checkConstraints);
  }
}
