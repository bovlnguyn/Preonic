import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionTypeToEscrowTransactions1786100000000 implements MigrationInterface {
  name = 'AddCommissionTypeToEscrowTransactions1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_EscrowTx_Type')
      BEGIN
        ALTER TABLE dbo.EscrowTransactions DROP CONSTRAINT CK_EscrowTx_Type
      END
    `);
    await queryRunner.query(`
      ALTER TABLE dbo.EscrowTransactions
      ADD CONSTRAINT CK_EscrowTx_Type
      CHECK (Type IN ('deposit','release','refund','commission'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_EscrowTx_Type')
      BEGIN
        ALTER TABLE dbo.EscrowTransactions DROP CONSTRAINT CK_EscrowTx_Type
      END
    `);
    await queryRunner.query(`
      ALTER TABLE dbo.EscrowTransactions
      ADD CONSTRAINT CK_EscrowTx_Type
      CHECK (Type IN ('deposit','release','refund'))
    `);
  }
}
