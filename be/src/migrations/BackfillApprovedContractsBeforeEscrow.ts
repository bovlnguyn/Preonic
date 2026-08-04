import { MigrationInterface, QueryRunner } from 'typeorm';

// Truoc ban fix nay, signContract() chuyen thang 'pending' -> 'active' ngay khi
// ky du hai ben, con 'approved' chua he duoc gan o dau. Nay 'active' chi con dung
// khi Escrow da duoc nap (xem depositEscrow trong escrow.service.ts), con hop dong
// da ky du hai ben nhung CHUA nap ky quy phai la 'approved'. Migration nay backfill
// lai cac hop dong active-nhung-chua-funded (du lieu tao truoc ban fix) ve 'approved'.
export class BackfillApprovedContractsBeforeEscrow1785700000000 implements MigrationInterface {
  name = 'BackfillApprovedContractsBeforeEscrow1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE dbo.Contracts
      SET Status = 'approved'
      WHERE Status = 'active' AND (EscrowStatus IS NULL OR EscrowStatus = 'none')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data backfill mot chieu -- khong the phan biet lai voi cac hop dong 'approved'
    // von di da ton tai truoc migration nay (neu co), nen khong hoan tac tu dong duoc.
  }
}
