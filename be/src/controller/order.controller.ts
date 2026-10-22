import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { cleanupUploadedFiles } from '../middlewares/uploads.middlewares';
import { assertGhnWebhookAuthorized, normalizeGhnWebhook } from '../services/ghn.service';
import {
  completeOrderContract,
  confirmOrderReceived,
  getOrderDetail,
  handOrderToCarrier,
  listOrdersForUser,
  markOrderReadyToShip,
  recordGhnTrackingEvent,
  requestCropReport,
  submitCropReport,
  updateReportSchedule,
} from '../services/order.service';
import { sendError } from '../utils/controller.util';

const imageUrls = (report: any): string[] => {
  try {
    const value = JSON.parse(report.imageUrlsJson || '[]');
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const formatReport = (report: any) => ({
  id: report.id,
  requestType: report.requestType,
  status: report.status,
  title: report.title,
  requestNote: report.requestNote,
  farmerNote: report.farmerNote,
  imageUrls: imageUrls(report),
  dueAt: report.dueAt,
  submittedAt: report.submittedAt,
  createdAt: report.createdAt,
});

const formatOrder = (order: any) => ({
  id: order.id,
  stage: order.stage,
  carrier: order.carrier,
  trackingCode: order.trackingCode,
  carrierStatus: order.carrierStatus,
  loadingPhotoUrl: order.loadingPhotoUrl,
  reportIntervalDays: order.reportIntervalDays,
  nextReportDueAt: order.nextReportDueAt,
  handedToCarrierAt: order.handedToCarrierAt,
  enterpriseReceivedAt: order.enterpriseReceivedAt,
  completedAt: order.completedAt,
  lastCarrierSyncAt: order.lastCarrierSyncAt,
  currentLocation: order.currentLocation,
  currentLatitude: order.currentLatitude,
  currentLongitude: order.currentLongitude,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  contract: order.contract ? {
    id: order.contract.id,
    contractCode: order.contract.contractCode,
    status: order.contract.status,
    product: { id: order.contract.productId, name: order.contract.productName || order.contract.product?.name },
    farmer: { id: order.contract.farmerId, name: order.contract.farmerName || order.contract.farmer?.fullName },
    enterprise: { id: order.contract.enterpriseId, name: order.contract.enterpriseName || order.contract.enterprise?.fullName },
    quantity: order.contract.quantity,
    unit: order.contract.unit,
    totalValue: order.contract.totalValue,
    paidAmount: order.contract.paidAmount,
    remainingAmount: order.contract.remainingAmount,
    deliveryDate: order.contract.deliveryDate,
    farmLocation: order.contract.farmLocation,
    deliveryAddress: order.contract.deliveryAddress,
  } : undefined,
});

export const listOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'farmer' && req.user!.role !== 'enterprise') {
      return res.status(403).json({ success: false, message: 'Vai trò không hỗ trợ đơn hàng' });
    }
    const result = await listOrdersForUser(req.user!.id, req.user!.role, req.query);
    return res.json({
      success: true,
      data: { orders: result.orders.map(formatOrder), pagination: result.pagination },
    });
  } catch (error: any) {
    return sendError(res, error, 'Không thể tải danh sách đơn hàng');
  }
};

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getOrderDetail(req.params.id, req.user!.id);
    return res.json({
      success: true,
      data: {
        order: formatOrder(result.order),
        reports: result.reports.map(formatReport),
        trackingEvents: result.trackingEvents,
      },
    });
  } catch (error: any) {
    return sendError(res, error, 'Không thể tải chi tiết đơn hàng');
  }
};

export const setReportSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const order = await updateReportSchedule(req.params.id, req.user!.id, req.body?.intervalDays);
    return res.json({ success: true, message: 'Đã cập nhật chu kỳ báo cáo', data: { order: formatOrder(order) } });
  } catch (error: any) {
    return sendError(res, error, 'Không thể cập nhật chu kỳ báo cáo');
  }
};

export const createCropReportRequest = async (req: AuthRequest, res: Response) => {
  try {
    const report = await requestCropReport(req.params.id, req.user!.id, req.body || {});
    return res.status(201).json({ success: true, message: 'Đã gửi yêu cầu báo cáo cho nông dân', data: { report: formatReport(report) } });
  } catch (error: any) {
    return sendError(res, error, 'Không thể gửi yêu cầu báo cáo');
  }
};

export const createCropReport = async (req: AuthRequest, res: Response) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const report = await submitCropReport(
      req.params.id,
      req.user!.id,
      req.body || {},
      files.map((file) => file.path)
    );
    return res.status(201).json({ success: true, message: 'Đã gửi báo cáo canh tác', data: { report: formatReport(report) } });
  } catch (error: any) {
    await cleanupUploadedFiles(req);
    return sendError(res, error, 'Không thể gửi báo cáo canh tác');
  }
};

export const readyOrderForShipping = async (req: AuthRequest, res: Response) => {
  try {
    const order = await markOrderReadyToShip(req.params.id, req.user!.id, req.body?.note);
    return res.json({ success: true, message: 'Đơn hàng đã sẵn sàng giao', data: { order: formatOrder(order) } });
  } catch (error: any) {
    return sendError(res, error, 'Không thể cập nhật đơn hàng');
  }
};

export const handoverOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await handOrderToCarrier(req.params.id, req.user!.id, req.body || {}, req.file?.path);
    return res.json({ success: true, message: 'Đã ghi nhận bàn giao đơn hàng', data: { order: formatOrder(order) } });
  } catch (error: any) {
    await cleanupUploadedFiles(req);
    return sendError(res, error, 'Không thể ghi nhận bàn giao vận chuyển');
  }
};

export const receiveOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await confirmOrderReceived(req.params.id, req.user!.id, req.body?.note);
    return res.json({ success: true, message: 'Đã xác nhận doanh nghiệp nhận hàng', data: { order: formatOrder(order) } });
  } catch (error: any) {
    return sendError(res, error, 'Không thể xác nhận nhận hàng');
  }
};

export const completeOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await completeOrderContract(req.params.id, req.user!.id);
    return res.json({ success: true, message: 'Hợp đồng đã hoàn tất', data: { order: formatOrder(order) } });
  } catch (error: any) {
    return sendError(res, error, 'Không thể hoàn tất hợp đồng');
  }
};

export const ghnWebhook = async (req: Request, res: Response) => {
  try {
    assertGhnWebhookAuthorized(String(req.header('x-ghn-secret') || req.query.secret || ''));
    const event = normalizeGhnWebhook(req.body);
    await recordGhnTrackingEvent(event);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return sendError(res, error, 'Không thể xử lý cập nhật GHN');
  }
};
