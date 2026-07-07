import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthProvider1720100000000 implements MigrationInterface {
  name = 'AddAuthProvider1720100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE Users ADD AuthProvider NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_AuthProvider DEFAULT 'local'`
    );
    await queryRunner.query(
      `ALTER TABLE Users ADD CONSTRAINT CK_Users_AuthProvider CHECK (AuthProvider IN ('local','google'))`
    );
    // Lưu ý: tài khoản Google tạo TRƯỚC migration này sẽ mang giá trị mặc định 'local'
    // (không có tín hiệu đáng tin cậy để suy ngược). Người dùng đó chỉ cần dùng
    // "Quên mật khẩu" một lần để đặt mật khẩu mà họ biết, không ảnh hưởng chức năng.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE Users DROP CONSTRAINT CK_Users_AuthProvider`);
    await queryRunner.query(`ALTER TABLE Users DROP CONSTRAINT DF_Users_AuthProvider`);
    await queryRunner.query(`ALTER TABLE Users DROP COLUMN AuthProvider`);
  }
}
