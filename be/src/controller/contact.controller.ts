import { Request, Response } from 'express';
import { submitContactRequest } from '../services/contact.service';
import { sendError } from '../utils/controller.util';
import { logAction, logError } from '../services/systemLog.service';

export const sendContactRequest = async (req: Request, res: Response) => {
  try {
    const result = await submitContactRequest(req.body);

    logAction({
      category: 'contact',
      action: 'contact_request_sent',
      message: `Yêu cầu liên hệ ${req.body.audience} đã được gửi`,
      metadata: {
        topic: req.body.topic,
        acknowledgementSent: result.acknowledgementSent,
      },
      ipAddress: req.ip,
    });

    return res.status(202).json({
      success: true,
      message: result.acknowledgementSent
        ? 'Yêu cầu đã được gửi. Vui lòng kiểm tra email xác nhận.'
        : 'Yêu cầu đã được gửi tới đội hỗ trợ.',
      data: { acknowledgementSent: result.acknowledgementSent },
    });
  } catch (error: any) {
    logError({
      category: 'contact',
      action: 'contact_request_failed',
      level: 'warn',
      message: 'Không thể gửi yêu cầu liên hệ qua SMTP',
      metadata: { audience: req.body?.audience, topic: req.body?.topic },
      ipAddress: req.ip,
      error,
    });
    return sendError(res, error, 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.');
  }
};
