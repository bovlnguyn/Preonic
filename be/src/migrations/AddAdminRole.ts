import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminRole1718600000000 implements MigrationInterface {
    name = 'AddAdminRole1718600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Users DROP CONSTRAINT CK_Users_Role`);
        await queryRunner.query(`ALTER TABLE Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('farmer','enterprise','admin'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE Users DROP CONSTRAINT CK_Users_Role`);
        await queryRunner.query(`ALTER TABLE Users ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('farmer','enterprise'))`);
    }
}