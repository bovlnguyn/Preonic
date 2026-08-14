import { Response } from 'express';

const isClientSafeStatus = (status: number) => status >= 400 && status < 500;

/**
 * Chuẩn hóa lỗi trả về từ controller.
 *
 * - Lỗi nghiệp vụ 4xx do service chủ động tạo được phép trả message/code cho FE.
 * - Lỗi 5xx bất ngờ (TypeORM/SQL/Cloudinary/programming error...) KHÔNG trả
 *   err.message để tránh lộ tên bảng/cột/constraint/query/stack cho client.
 * - Gắn error thật vào res.locals để app.ts/SystemLog vẫn ghi được chi tiết phía server.
 */
export const sendError = (
  res: Response,
  err: any,
  fallbackMessage: string,
  fallbackStatus = 500
) => {
  const explicitStatusValue = err?.statusCode ?? err?.status;
  const hasExplicitStatus = explicitStatusValue !== undefined && explicitStatusValue !== null;
  const rawStatus = Number(hasExplicitStatus ? explicitStatusValue : fallbackStatus);
  const status = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : fallbackStatus;

  // Chỉ expose message khi service CHỦ ĐỘNG gắn 4xx. Một Error kỹ thuật không
  // có status nhưng controller dùng fallback 401/400 vẫn phải dùng fallbackMessage.
  const exposeDetails = hasExplicitStatus && isClientSafeStatus(status);
  res.locals.apiError = err;

  return res.status(status).json({
    success: false,
    status: 'error',
    ...(exposeDetails && err?.code ? { code: String(err.code) } : {}),
    message: exposeDetails && err?.message ? String(err.message) : fallbackMessage,
  });
};
