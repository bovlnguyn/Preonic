# PreOnic — Hướng dẫn Setup từ đầu

## Yêu cầu hệ thống

* Node.js 18+
* SQL Server 2019+ (hoặc Azure SQL)
* npm hoặc yarn

---

## BƯỚC 1 — Tạo Database

Mở SQL Server Management Studio (SSMS) hoặc Azure Data Studio,
chạy toàn bộ file `preonic_schema.sql` đã có để tạo DB và 12 bảng.

Kiểm tra thành công:

```sql
USE preonic;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
-- Phải thấy đủ 12+ bảng
```

---

## BƯỚC 2 — Setup Backend

```bash
# 1. Vào thư mục backend
cd be

# 2. Cài dependencies
npm install

# 3. Copy và điền .env
cp .env.example .env
```

Mở `.env`, điền các giá trị bắt buộc:

```
DB_HOST=localhost          # hoặc IP máy chủ SQL Server
DB_PORT=1433
DB_USERNAME=sa             # hoặc tài khoản SQL Server của bạn
DB_PASSWORD=...            # mật khẩu SQL Server
DB_DATABASE=preonic

JWT_SECRET=...             # chuỗi ngẫu nhiên dài ≥32 ký tự
JWT_REFRESH_SECRET=...     # chuỗi khác với JWT_SECRET

FRONTEND_URL=http://localhost:3000
```

```bash
# 4. Chạy development
npm run dev
```

Kiểm tra:

```
GET http://localhost:8080/health
→ { "status": "success", "database": "connected" }
```

---

## BƯỚC 3 — Setup Frontend

```bash
# 1. Vào thư mục frontend
cd fe

# 2. Cài dependencies
npm install

# 3. Copy và điền .env
cp .env.example .env
# Chỉ cần đảm bảo REACT_APP_API_URL khớp với PORT của backend

# 4. Chạy development
npm start
```

Frontend chạy tại: http://localhost:3000

---

## Cấu trúc thư mục Backend khuyến nghị

```
be/
├── src/
│   ├── config/
│   │   └── database.ts          ← file kết nối SQL Server
│   ├── models/                  ← TypeORM Entity (1 file = 1 bảng)
│   │   ├── User.entity.ts
│   │   ├── Product.entity.ts
│   │   ├── Contract.entity.ts
│   │   └── ...
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   │   └── logger.ts
│   ├── migrations/              ← TypeORM migration files
│   ├── app.ts
│   └── server.ts
├── uploads/                     ← file upload (ảnh sản phẩm, chứng chỉ)
├── .env                         ← không commit lên Git
├── .env.example                 ← commit lên Git
├── package.json
└── tsconfig.json
```

---

## Lưu ý quan trọng

### DB_SYNCHRONIZE

* `DB_SYNCHRONIZE=false` (mặc định và khuyến nghị)
  → Schema đã được tạo bằng file SQL, TypeORM chỉ map Entity vào bảng có sẵn.
* `DB_SYNCHRONIZE=true`
  → TypeORM tự ALTER TABLE theo Entity. Chỉ dùng khi thêm cột mới trong dev.
  → **TUYỆT ĐỐI KHÔNG dùng true trên production.**

### DB_TRUST_SERVER_CERTIFICATE

* `true` = môi trường local/dev, SQL Server dùng self-signed cert.
* `false` = production, Azure SQL đã có cert hợp lệ.

### Naming Convention — Entity vs SQL

SQL Schema dùng PascalCase (UserId, FirstName...).
TypeORM Entity dùng camelCase (id, firstName...) với `@Column({ name: 'UserId' })`.
Xem `User.entity.ts` làm mẫu.

---

## Các lệnh hữu ích

```bash
# Backend
npm run dev          # chạy development với hot-reload
npm run build        # build TypeScript ra dist/
npm start            # chạy production

# Migration (khi cần thêm cột mới trên production)
npm run migration:generate --name=AddPhoneIndex
npm run migration:run
npm run migration:revert   # rollback migration cuối
```
