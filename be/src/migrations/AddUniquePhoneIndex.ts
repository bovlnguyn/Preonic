import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Login cho phép dùng số điện thoại, vì vậy Phone phải định danh duy nhất.
 * Migration cố ý dừng với thông báo rõ ràng nếu DB cũ đang có số trùng,
 * thay vì tự ý sửa/xóa dữ liệu người dùng.
 */
export class AddUniquePhoneIndex1786650000000 implements MigrationInterface {
  name = 'AddUniquePhoneIndex1786650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE dbo.Users
      SET Phone = NULL
      WHERE Phone IS NOT NULL AND LTRIM(RTRIM(Phone)) = '';
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT LTRIM(RTRIM(Phone)) AS NormalizedPhone
        FROM dbo.Users
        WHERE Phone IS NOT NULL
        GROUP BY LTRIM(RTRIM(Phone))
        HAVING COUNT(*) > 1
      )
      BEGIN
        THROW 50001, N'Không thể tạo unique index cho Users.Phone vì dữ liệu hiện tại có số điện thoại bị trùng. Hãy xử lý các số trùng rồi chạy lại migration.', 1;
      END;
    `);

    await queryRunner.query(`
      UPDATE dbo.Users
      SET Phone = LTRIM(RTRIM(Phone))
      WHERE Phone IS NOT NULL;
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_Users_Phone'
          AND object_id = OBJECT_ID('dbo.Users')
      )
      BEGIN
        CREATE UNIQUE INDEX UX_Users_Phone
        ON dbo.Users (Phone)
        WHERE Phone IS NOT NULL;
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'UX_Users_Phone'
          AND object_id = OBJECT_ID('dbo.Users')
      )
      BEGIN
        DROP INDEX UX_Users_Phone ON dbo.Users;
      END;
    `);
  }
}
