import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlantDateToProduct1784121600000 implements MigrationInterface {
  name = 'AddPlantDateToProduct1784121600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Products', 'PlantDate') IS NULL
      BEGIN
        ALTER TABLE dbo.Products
        ADD PlantDate DATE NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('dbo.Products', 'PlantDate') IS NOT NULL
      BEGIN
        ALTER TABLE dbo.Products
        DROP COLUMN PlantDate
      END
    `);
  }
}
