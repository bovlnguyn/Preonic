import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelPendingStatusToContracts1720900100000 implements MigrationInterface {
  name = 'AddCancelPendingStatusToContracts1720900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Contracts_Status')
      BEGIN
        ALTER TABLE dbo.Contracts DROP CONSTRAINT CK_Contracts_Status
      END
    `);
    await queryRunner.query(`
      ALTER TABLE dbo.Contracts
      ADD CONSTRAINT CK_Contracts_Status
      CHECK (Status IN ('draft','pending','approved','active','cancel_pending','completed','cancelled','disputed'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Contracts_Status')
      BEGIN
        ALTER TABLE dbo.Contracts DROP CONSTRAINT CK_Contracts_Status
      END
    `);
    await queryRunner.query(`
      ALTER TABLE dbo.Contracts
      ADD CONSTRAINT CK_Contracts_Status
      CHECK (Status IN ('draft','pending','approved','active','completed','cancelled','disputed'))
    `);
  }
}
