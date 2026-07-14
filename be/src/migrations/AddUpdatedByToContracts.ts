import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedByToContracts1720450000000 implements MigrationInterface {
  name = 'AddUpdatedByToContracts1720450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'UpdatedBy') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD UpdatedBy UNIQUEIDENTIFIER NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'UpdatedBy') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN UpdatedBy
      END
    `);
  }
}