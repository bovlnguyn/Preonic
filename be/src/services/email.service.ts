import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

const required = (name: string): string => {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    const error: any = new Error(`Máy chủ chưa cấu hình ${name}`);
    error.statusCode = 503;
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  return value;
};

const getTransporter = () => {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: required('SMTP_HOST'),
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    requireTLS: port !== 465,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10_000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10_000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20_000),
    auth: {
      user: required('SMTP_USER'),
      pass: required('SMTP_PASS'),
    },
  });

  return transporter;
};

const getFrom = () => {
  const name = process.env.SMTP_FROM_NAME?.trim() || 'PreOnic Platform';
  const email = process.env.SMTP_FROM_EMAIL?.trim() || required('SMTP_USER');
  return `"${name.replace(/["\r\n]/g, '')}" <${email}>`;
};

const getSupportInbox = () =>
  process.env.SUPPORT_INBOX_EMAIL?.trim() || 'nguyenbao.130304@gmail.com';

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const sendResetPasswordEmail = async (
  toEmail: string,
  resetToken: string,
  userName: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await getTransporter().sendMail({
    from: getFrom(),
    replyTo: getSupportInbox(),
    to:      toEmail,
    subject: 'Đặt lại mật khẩu PreOnic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${escapeHtml(userName)}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản PreOnic của bạn.
          </p>
          <p style="color: #6b7c70; line-height: 1.6;">
            Nhấn vào nút bên dưới để đặt lại mật khẩu. Link này có hiệu lực trong <strong>10 phút</strong>.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(resetUrl)}"
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
            <a href="${escapeHtml(resetUrl)}" style="color: #16a34a;">${escapeHtml(resetUrl)}</a>
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

export const buildOrderUrl = (role: 'farmer' | 'enterprise', orderId: string) =>
  `${process.env.FRONTEND_URL}/${role}/orders/${orderId}`;

// Email dung chung cho moi su kien thong bao trong he thong (hop dong, ky quy, tranh chap...)
// -- noi dung tieu de/message duoc truyen vao giong het Notification tuong ung de dam bao nhat quan.
export const sendNotificationEmail = async (
  toEmail: string,
  userName: string,
  title: string,
  message: string,
  actionUrl?: string
) => {
  await getTransporter().sendMail({
    from: getFrom(),
    replyTo: getSupportInbox(),
    to:      toEmail,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${escapeHtml(userName)}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">${escapeHtml(message)}</p>

          ${actionUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(actionUrl)}"
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

  await getTransporter().sendMail({
    from: getFrom(),
    replyTo: getSupportInbox(),
    to:      toEmail,
    subject: 'Xác minh email PreOnic',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🌾 PreOnic</h1>
        </div>

        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <h2 style="color: #0f1d12; margin-bottom: 16px;">Xin chào ${escapeHtml(userName)}!</h2>
          <p style="color: #6b7c70; line-height: 1.6;">
            Cảm ơn bạn đã đăng ký tài khoản PreOnic. 
            Vui lòng xác minh email để hoàn tất đăng ký.
          </p>
          <p style="color: #6b7c70; line-height: 1.6;">
            Nhấn vào nút bên dưới để xác minh email. Link này có hiệu lực trong <strong>24 giờ</strong>.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${escapeHtml(verifyUrl)}"
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
            <a href="${escapeHtml(verifyUrl)}" style="color: #16a34a;">${escapeHtml(verifyUrl)}</a>
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

interface ContactEmailInput {
  audience: 'public' | 'farmer' | 'enterprise';
  topic: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}

const audienceLabel = {
  public: 'Khách truy cập',
  farmer: 'Farmer',
  enterprise: 'Doanh nghiệp',
} as const;

export const sendContactRequestEmail = async (input: ContactEmailInput) => {
  const inbox = getSupportInbox();
  const info = await getTransporter().sendMail({
    from: getFrom(),
    to: inbox,
    replyTo: { name: input.name, address: input.email },
    subject: `[PreOnic · ${audienceLabel[input.audience]}] ${input.topic}`,
    text: [
      `Nhóm người dùng: ${audienceLabel[input.audience]}`,
      `Họ tên: ${input.name}`,
      `Email: ${input.email}`,
      input.phone ? `Điện thoại: ${input.phone}` : '',
      input.company ? `Doanh nghiệp: ${input.company}` : '',
      `Chủ đề: ${input.topic}`,
      '',
      input.message,
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#173523">
        <div style="padding:22px 26px;color:#fff;background:#166534;border-radius:14px 14px 0 0">
          <h1 style="margin:0;font-size:22px">Yêu cầu hỗ trợ PreOnic</h1>
        </div>
        <div style="padding:26px;border:1px solid #dcfce7;border-top:0">
          <p><strong>Nhóm người dùng:</strong> ${escapeHtml(audienceLabel[input.audience])}</p>
          <p><strong>Họ tên:</strong> ${escapeHtml(input.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
          ${input.phone ? `<p><strong>Điện thoại:</strong> ${escapeHtml(input.phone)}</p>` : ''}
          ${input.company ? `<p><strong>Doanh nghiệp:</strong> ${escapeHtml(input.company)}</p>` : ''}
          <p><strong>Chủ đề:</strong> ${escapeHtml(input.topic)}</p>
          <div style="margin-top:20px;padding:18px;white-space:pre-wrap;line-height:1.65;background:#f0fdf4;border-radius:12px">${escapeHtml(input.message)}</div>
        </div>
      </div>
    `,
  });

  return info.messageId;
};

export const sendContactAcknowledgement = async (input: ContactEmailInput) => {
  await getTransporter().sendMail({
    from: getFrom(),
    to: input.email,
    replyTo: getSupportInbox(),
    subject: 'PreOnic đã nhận được yêu cầu hỗ trợ của bạn',
    text: `Xin chào ${input.name},\n\nPreOnic đã nhận được yêu cầu "${input.topic}". Đội hỗ trợ sẽ phản hồi qua email này trong thời gian sớm nhất.\n\nTrân trọng,\nPreOnic`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#173523">
        <div style="padding:24px;color:#fff;background:#166534;border-radius:14px 14px 0 0">
          <h1 style="margin:0;font-size:22px">PreOnic đã nhận yêu cầu</h1>
        </div>
        <div style="padding:28px;border:1px solid #dcfce7;border-top:0;line-height:1.65">
          <p>Xin chào <strong>${escapeHtml(input.name)}</strong>,</p>
          <p>Chúng tôi đã nhận được yêu cầu <strong>${escapeHtml(input.topic)}</strong>. Đội hỗ trợ sẽ phản hồi qua email này trong thời gian sớm nhất.</p>
          <p style="color:#64748b">Bạn có thể trả lời trực tiếp email này để bổ sung thông tin.</p>
        </div>
      </div>
    `,
  });
};

export const verifyEmailTransport = async () => {
  await getTransporter().verify();
  return true;
};
