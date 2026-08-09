import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendResetPasswordEmail = async (
  toEmail: string,
  resetToken: string,
  userName: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to:      toEmail,
    subject: 'Đặt lại mật khẩu PreOnic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${userName}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản PreOnic của bạn.
          </p>
          <p style="color: #6b7c70; line-height: 1.6;">
            Nhấn vào nút bên dưới để đặt lại mật khẩu. Link này có hiệu lực trong <strong>10 phút</strong>.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
              style="background: #16a34a; color: #fff; padding: 14px 32px;
                     border-radius: 8px; text-decoration: none; font-weight: 700;
                     font-size: 16px; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            Tài khoản của bạn vẫn an toàn.
          </p>

          <p style="color: #9ca3af; font-size: 13px;">
            Hoặc copy link sau vào trình duyệt:<br/>
            <a href="${resetUrl}" style="color: #16a34a;">${resetUrl}</a>
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center;
                    border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2026 PreOnic. Nền tảng kết nối nông nghiệp bền vững.
          </p>
        </div>
      </div>
    `,
  });
};

// Link ve trang chi tiet hop dong, khac nhau theo role vi FE co route rieng cho tung dashboard.
export const buildContractUrl = (role: 'farmer' | 'enterprise', contractId: string) =>
  `${process.env.FRONTEND_URL}/${role}/contracts/${contractId}`;

// Email dung chung cho moi su kien thong bao trong he thong (hop dong, ky quy, tranh chap...)
// -- noi dung tieu de/message duoc truyen vao giong het Notification tuong ung de dam bao nhat quan.
export const sendNotificationEmail = async (
  toEmail: string,
  userName: string,
  title: string,
  message: string,
  actionUrl?: string
) => {
  await transporter.sendMail({
    from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to:      toEmail,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${userName}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">${message}</p>

          ${actionUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${actionUrl}"
              style="background: #16a34a; color: #fff; padding: 14px 32px;
                     border-radius: 8px; text-decoration: none; font-weight: 700;
                     font-size: 16px; display: inline-block;">
              Xem chi tiết
            </a>
          </div>` : ''}
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center;
                    border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2026 PreOnic. Nền tảng kết nối nông nghiệp bền vững.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendVerifyEmail = async (
  toEmail: string,
  verifyToken: string,
  userName: string
) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

  await transporter.sendMail({
    from:    `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
    to:      toEmail,
    subject: 'Xác minh email PreOnic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${userName}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản PreOnic. 
            Vui lòng xác minh email để hoàn tất đăng ký.
          </p>
          <p style="color: #6b7c70; line-height: 1.6;">
            Nhấn vào nút bên dưới để xác minh email. Link này có hiệu lực trong <strong>24 giờ</strong>.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}"
              style="background: #16a34a; color: #fff; padding: 14px 32px;
                     border-radius: 8px; text-decoration: none; font-weight: 700;
                     font-size: 16px; display: inline-block;">
              Xác minh email
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 13px;">
            Nếu bạn không đăng ký tài khoản PreOnic, hãy bỏ qua email này.
          </p>

          <p style="color: #9ca3af; font-size: 13px;">
            Hoặc copy link sau vào trình duyệt:<br/>
            <a href="${verifyUrl}" style="color: #16a34a;">${verifyUrl}</a>
          </p>
        </div>

        <div style="background: #f9fafb; padding: 16px; text-align: center;
                    border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © 2026 PreOnic. Nền tảng kết nối nông nghiệp bền vững.
          </p>
        </div>
      </div>
    `,
  });
};