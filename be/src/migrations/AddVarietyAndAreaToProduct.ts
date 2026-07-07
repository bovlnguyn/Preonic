import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVarietyAndAreaToProduct1719600000000 implements MigrationInterface {
    name = 'AddVarietyAndAreaToProduct1719600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Products ADD Variety NVARCHAR(200) NULL`);
        await queryRunner.query(`ALTER TABLE Products ADD Area DECIMAL(10,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Products DROP COLUMN Area`);
        await queryRunner.query(`ALTER TABLE Products DROP COLUMN Variety`);
    }
}
