# PreOnic production checklist

## Kiến trúc triển khai

- `fe` là React SPA và có thể chạy trên Vercel.
- `be` là Express server có cron jobs và kết nối SQL Server lâu dài. Hãy chạy nó trên một Node host bền vững (Azure App Service, Render, Railway, Fly.io hoặc VM), không đặt toàn bộ backend vào một Vercel serverless function.
- Trong Vercel, đặt `REACT_APP_API_URL=https://<backend-domain>/api/v1` trước khi build. `fe/vercel.json` chỉ còn rewrite cho React Router và không chuyển API qua tunnel tạm.

## Backend bắt buộc

- `NODE_ENV=production`, `DB_SYNCHRONIZE=false`, DB credentials và `DB_ENCRYPT=true` khi dùng Azure SQL/SQL public.
- `JWT_SECRET` và `JWT_REFRESH_SECRET` là hai chuỗi ngẫu nhiên khác nhau, tối thiểu 32 bytes.
- `FRONTEND_URL` là domain Vercel production chính xác, không có dấu `/` cuối. Thêm preview domains đã tin cậy vào `FRONTEND_URLS` khi thật sự cần.
- `TRUST_PROXY=1` nếu host có reverse proxy/load balancer.
- Frontend/backend khác site: `AUTH_COOKIE_SAME_SITE=none` và `AUTH_COOKIE_SECURE=true`. Nếu dùng `app.preonic.vn` + `api.preonic.vn`, đặt thêm `AUTH_COOKIE_DOMAIN=.preonic.vn` khi muốn dùng chung cookie domain.
- Cấu hình Cloudinary, SMTP, khóa mã hóa/HMAC dữ liệu ngân hàng, tài khoản nhận phí và webhook secret theo `be/.env.example`.
- Cấu hình `OPENAI_API_KEY` để Farmer AI và Enterprise AI hoạt động thật.

## Thu phí qua SePay

Đặt `FEE_PAYMENT_PROVIDER=bank_transfer`, thông tin tài khoản nhận phí, `FEE_PAYMENT_QR_BASE_URL=https://qr.sepay.vn/img` và `FEE_PAYMENT_QR_TTL_MINUTES=10`. Với cấu hình này trang **Thanh toán & Phí** hiển thị QR trực tiếp, khóa mã sau 10 phút và tự kiểm tra trạng thái mỗi 3 giây.

Trên SePay, tạo webhook nhận giao dịch tiền vào với URL:

```text
https://<backend-domain>/api/v1/billing/webhooks/bank_transfer
```

Chọn bảo mật **HMAC-SHA256**, đặt Secret Key trùng `FEE_PAYMENT_BANK_WEBHOOK_SECRET`, nội dung JSON và bật lọc mã thanh toán với tiền tố `PRNFEE`. Backend kiểm tra chữ ký `X-SePay-Signature`, timestamp chống phát lại, đúng tài khoản nhận, đúng mã thanh toán và đúng số tiền trước khi ghi nhận. Không dùng chế độ webhook “Không xác thực” ở production.

## Xác minh tài khoản ngân hàng

PreOnic dùng adapter HTTPS độc lập vì QR chuyển khoản không xác nhận được tài khoản đích có tồn tại. Provider nhận:

```json
{ "bankCode": "VCB", "accountNumber": "0123456789" }
```

và trả một trong các dạng tương thích:

```json
{ "valid": true, "accountHolder": "NGUYEN VAN A", "reference": "request-id" }
```

Đặt `BANK_ACCOUNT_VERIFICATION_URL`, `BANK_ACCOUNT_VERIFICATION_API_KEY` và `BANK_ACCOUNT_VERIFICATION_PROVIDER`. Chỉ bật `BANK_ACCOUNT_VERIFICATION_REQUIRED=true` sau khi provider production ổn định. Khi chưa cấu hình, hệ thống vẫn lưu được tài khoản nhưng gắn rõ `Chưa xác minh`; tuyệt đối không hiển thị thành đã xác minh.

## Trước khi mở người dùng

1. Drop và tạo lại database bằng `Preonic Database/01_Preonic_V2_CreateDatabase.sql`, sau đó chạy `02_Preonic_V2_SeedData.sql` nếu cần demo data.
2. Chạy `npm ci && npm run build` trong `be`, rồi `npm test -- --runInBand`.
3. Chạy `npm ci && npm run build` trong `fe`, rồi `npm test -- --watchAll=false`.
4. Kiểm tra `/health`, đăng nhập/refresh sau khi đóng mở trình duyệt, upload ảnh, ký một hợp đồng, chuyển khoản thử, xác nhận tiền, bảng kê phí, báo cáo dòng tiền và cả hai trang AI.
5. Theo dõi logs 5xx, webhook signature failures, SQL connection health và quota OpenAI trong đợt feedback đầu tiên.
