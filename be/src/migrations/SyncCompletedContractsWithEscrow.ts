import { MigrationInterface, QueryRunner } from 'typeorm';

// Du lieu backfill: truoc ban fix nay, confirmMilestone() chi chuyen Escrow.Status
// sang 'completed' khi giai ngan het ky quy nhung khong dong bo Contracts.Status,
// khien don hang da hoan tat (Escrow completed) nhung hop dong van hien 'active'.
// Migration nay chi cap nhat lai cac hop dong da bi ket ket qua cu do.
export class SyncCompletedContractsWithEscrow1785600000000 implements MigrationInterface {
  name = 'SyncCompletedContractsWithEscrow1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE c
      SET c.Status = 'completed',
          c.CompletedAt = ISNULL(c.CompletedAt, GETDATE()),
          c.EscrowStatus = 'released',
          c.PaidAmount = e.ReleasedAmount,
          c.RemainingAmount = 0
      FROM dbo.Contracts c
      INNER JOIN dbo.Escrows e ON e.ContractId = c.ContractId
      WHERE e.Status = 'completed' AND c.Status <> 'completed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data backfill mot chieu -- khong the xac dinh lai trang thai cu truoc do
    // (co the la 'active' hoac 'pending'), nen khong hoan tac tu dong duoc.
  }
}
