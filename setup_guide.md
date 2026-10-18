# PreOnic — hướng dẫn setup nhanh

Tài liệu đầy đủ và cập nhật nằm trong [README.md](./README.md). Hệ thống hiện dùng thanh toán tiền hàng trực tiếp từ doanh nghiệp đến tài khoản ngân hàng của nông dân; phí dịch vụ được ghi vào sổ phí riêng và thanh toán ngay hoặc theo bảng kê tháng.

## Yêu cầu

- Node.js 20+
- npm
- SQL Server 2019+
- Cổng `1433`, `8080` và `3000` còn trống

## 1. Tạo database

Chạy theo thứ tự trong SQL Server Management Studio hoặc Azure Data Studio:

1. `Preonic Database/01_Preonic_V2_CreateDatabase.sql`
2. `Preonic Database/02_Preonic_V2_SeedData.sql`

Database được tạo là `preonic_v2`. Script đầu tạo trực tiếp 27 bảng ứng dụng ở trạng thái cuối; script sau thêm 3 tài khoản, 10 nông sản có ảnh và 10 hợp đồng demo. Seed không tạo tài khoản ngân hàng hoặc dữ liệu dòng tiền giả. Không chạy migration sau hai script này.

## 2. Chạy backend

```bash
cd be
npm ci
cp .env.example .env
npm run dev
```

Điền tối thiểu cấu hình SQL Server, hai JWT secret và các khóa thanh toán trong `be/.env`. Giữ `DB_SYNCHRONIZE=false`. Backend chạy tại `http://localhost:8080`.

Hai khóa ngân hàng phải là các bí mật base64 độc lập. Tạo từng khóa bằng:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ở production, cấu hình tài khoản thu phí và webhook HMAC theo phần “Thanh toán trực tiếp và thu phí nền tảng” trong README. Backend sẽ dừng ngay khi cấu hình thanh toán production thiếu hoặc không hợp lệ.

## 3. Chạy frontend

```bash
cd fe
npm ci
cp .env.example .env
npm start
```

Frontend chạy tại `http://localhost:3000` và gọi API qua `http://localhost:8080/api/v1`.

## 4. Kiểm tra

```bash
cd be
npm run build
npx jest --runInBand

cd ../fe
npm run build
CI=true npm test -- --watchAll=false --runInBand
```

`GET http://localhost:8080/health` chỉ xác nhận HTTP server. Log `SQL Server Connected` hoặc một API dữ liệu trả thành công mới xác nhận kết nối database.
