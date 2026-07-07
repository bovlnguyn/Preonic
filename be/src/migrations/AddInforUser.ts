// be/src/migrations/AddUserProfileFields<timestamp>.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields1720000000000 implements MigrationInterface {
  name = 'AddUserProfileFields1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE Users ADD FarmName NVARCHAR(255) NULL`);
    await queryRunner.query(`ALTER TABLE Users ADD FarmSize DECIMAL(10,2) NULL`);
    await queryRunner.query(`ALTER TABLE Users ADD CompanyName NVARCHAR(255) NULL`);
    await queryRunner.query(`ALTER TABLE Users ADD TaxCode NVARCHAR(20) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE Users DROP COLUMN TaxCode`);
    await queryRunner.query(`ALTER TABLE Users DROP COLUMN CompanyName`);
    await queryRunner.query(`ALTER TABLE Users DROP COLUMN FarmSize`);
    await queryRunner.query(`ALTER TABLE Users DROP COLUMN FarmName`);
  }
}