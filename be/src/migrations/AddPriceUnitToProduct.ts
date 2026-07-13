import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPriceUnitToProduct1752300000000 implements MigrationInterface {
    name = 'AddPriceUnitToProduct1752300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Products ADD PriceUnit NVARCHAR(50) NULL`);
        await queryRunner.query(`UPDATE Products SET PriceUnit = Unit WHERE PriceUnit IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Products DROP COLUMN PriceUnit`);
    }
}
