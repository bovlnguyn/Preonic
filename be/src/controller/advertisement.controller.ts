import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import * as advertisementService from '../services/advertisement.service';
import { cleanupUploadedFiles } from '../middlewares/uploads.middlewares';
import { sendError } from '../utils/controller.util';

export const pricing = (_req: Request, res: Response) => {
  res.json({ success: true, data: advertisementService.getPricing() });
};

export const listPublic = async (req: Request, res: Response) => {
  try {
    const campaigns = await advertisementService.listPublic(String(req.query.province || ''));
    res.json({ success: true, data: campaigns });
  } catch (error) {
    sendError(res, error, 'Không thể tải banner quảng cáo');
  }
};

export const listMine = async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await advertisementService.listMine(req.user!.id);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    sendError(res, error, 'Không thể tải chiến dịch quảng cáo');
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await advertisementService.create(req.user!.id, req.body, req.file?.path || '');
    res.status(201).json({
      success: true,
      message: 'Chiến dịch đã bắt đầu và chi phí đã được ghi vào kỳ phí tháng.',
      data: campaign,
    });
  } catch (error) {
    await cleanupUploadedFiles(req);
    sendError(res, error, 'Không thể tạo chiến dịch quảng cáo');
  }
};

export const cancel = async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await advertisementService.cancel(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Đã dừng chiến dịch.', data: campaign });
  } catch (error) {
    sendError(res, error, 'Không thể dừng chiến dịch');
  }
};

export const track = (event: 'impression' | 'click') => async (req: Request, res: Response) => {
  try {
    await advertisementService.track(req.params.id, event);
    res.status(204).end();
  } catch {
    // Tracking không được làm gián đoạn trải nghiệm trang chủ.
    res.status(204).end();
  }
};
