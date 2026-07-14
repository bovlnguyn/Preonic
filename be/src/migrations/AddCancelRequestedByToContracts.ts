import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelRequestedByToContracts1720900000000 implements MigrationInterface {
  name = 'AddCancelRequestedByToContracts1720900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'CancelRequestedBy') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD CancelRequestedBy UNIQUEIDENTIFIER NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'CancelRequestedBy') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN CancelRequestedBy
      END
    `);
  }
}
