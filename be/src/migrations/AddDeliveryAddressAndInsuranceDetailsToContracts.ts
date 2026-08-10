import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryAddressAndInsuranceDetailsToContracts1785900000000 implements MigrationInterface {
  name = 'AddDeliveryAddressAndInsuranceDetailsToContracts1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'DeliveryAddress') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD DeliveryAddress NVARCHAR(500) NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsurancePolicyNumber') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsurancePolicyNumber NVARCHAR(100) NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuredValue') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuredValue DECIMAL(18,2) NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceCoveredEvents') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuranceCoveredEvents NVARCHAR(30) NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceValidFrom') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuranceValidFrom DATE NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceValidTo') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuranceValidTo DATE NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceRiskSharingTerms') IS NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        ADD InsuranceRiskSharingTerms NVARCHAR(MAX) NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceRiskSharingTerms') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsuranceRiskSharingTerms
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceValidTo') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsuranceValidTo
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceValidFrom') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsuranceValidFrom
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuranceCoveredEvents') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsuranceCoveredEvents
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsuredValue') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsuredValue
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'InsurancePolicyNumber') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN InsurancePolicyNumber
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('dbo.Contracts', 'DeliveryAddress') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Contracts
        DROP COLUMN DeliveryAddress
      END
    `);
  }
}
