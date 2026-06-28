import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImagesAndCertFileUrl1719500000000 implements MigrationInterface {
    name = 'AddImagesAndCertFileUrl1719500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Products ADD Images NVARCHAR(MAX) NULL`);
        await queryRunner.query(`ALTER TABLE ProductCertifications ADD FileUrl NVARCHAR(500) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE ProductCertifications DROP COLUMN FileUrl`);
        await queryRunner.query(`ALTER TABLE Products DROP COLUMN Images`);
    }
}