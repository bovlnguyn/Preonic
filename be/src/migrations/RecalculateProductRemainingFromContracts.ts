import { MigrationInterface, QueryRunner } from 'typeorm';

// Truoc ban fix o signContract() (tru Products.Remaining khi hop dong duoc ky du hai
// ben), cac hop dong da ky/hoan tat tu truoc do khong he lam giam san luong con lai
// cua san pham. Migration nay tinh lai Remaining tu dau cho tung san pham: lay
// TotalQuantity tru tong Quantity cua cac hop dong da qua diem ky du hai ben va chua
// bi huy hoan toan (approved/active/cancel_pending/completed/disputed), quy doi qua
// kg de cong tru dung don vi (kg/ta/tan) roi quy doi nguoc lai don vi cua san pham.
// Tinh lai tu dau (khong cong don) nen idempotent -- chay lai nhieu lan van ra ket
// qua dung, ke ca voi san pham da duoc tru dung boi code moi.
export class RecalculateProductRemainingFromContracts1786000000000 implements MigrationInterface {
  name = 'RecalculateProductRemainingFromContracts1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE p
      SET p.Remaining = CASE WHEN r.RemainingKg < 0 THEN 0 ELSE ROUND(r.RemainingKg / r.UnitFactor, 2) END
      FROM dbo.Products p
      CROSS APPLY (
        SELECT
          CASE p.Unit WHEN N'tấn' THEN 1000 WHEN N'tạ' THEN 100 ELSE 1 END AS UnitFactor,
          (COALESCE(p.TotalQuantity, 0) * (CASE p.Unit WHEN N'tấn' THEN 1000 WHEN N'tạ' THEN 100 ELSE 1 END))
            - COALESCE((
                SELECT SUM(c.Quantity * (CASE c.Unit WHEN N'tấn' THEN 1000 WHEN N'tạ' THEN 100 ELSE 1 END))
                FROM dbo.Contracts c
                WHERE c.ProductId = p.ProductId
                  AND c.Status IN ('approved', 'active', 'cancel_pending', 'completed', 'disputed')
              ), 0) AS RemainingKg
      ) r
      WHERE p.TotalQuantity IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data backfill mot chieu -- khong luu lai gia tri Remaining cu truoc khi tinh
    // lai nen khong the hoan tac tu dong duoc.
  }
}
