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