import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Contract } from '../models/Contract.entity';
import { CropProgressReport } from '../models/CropProgressReport.entity';
import { FulfillmentOrder, FulfillmentStage } from '../models/FulfillmentOrder.entity';
import { Notification } from '../models/Notification.entity';
import { ShipmentTrackingEvent } from '../models/ShipmentTrackingEvent.entity';
import { User } from '../models/User.entity';
import { makeError } from '../utils/error.util';
import { displayName } from '../utils/user.util';
import { buildOrderUrl, sendNotificationEmail } from './email.service';
import {
  acceptDirectContractDelivery,
  markDirectContractPreparing,
  markDirectContractShipped,
} from '../modules/direct-payment-v2/direct-contract-workflow.service';
import { GHN_DELIVERED_STATUSES, NormalizedGhnEvent } from './ghn.service';

const orderRepo = () => AppDataSource.getRepository(FulfillmentOrder);
const contractRepo = () => AppDataSource.getRepository(Contract);
const reportRepo = () => AppDataSource.getRepository(CropProgressReport);
const trackingRepo = () => AppDataSource.getRepository(ShipmentTrackingEvent);

const ORDER_RELATIONS = {
  contract: {
    product: true,
    farmer: true,
    enterprise: true,
  },
} as const;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const cleanText = (value: unknown, max: number, field: string, required = false): string | null => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (required && !normalized) throw makeError(`${field} là bắt buộc`, 400);
  if (normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw makeError(`${field} không hợp lệ`, 400);
  }
  return normalized || null;
};

const initialStage = (contract: Contract): FulfillmentStage => {
  if (contract.status === 'completed') return 'completed';
  if (contract.deliveryStatus === 'delivered') return 'delivered';
  if (contract.deliveryStatus === 'shipping') return 'in_transit';
  if (contract.deliveryStatus === 'preparing') return 'ready_to_ship';
  return 'cultivating';
};

export const ensureOrderForContract = async (contract: Contract): Promise<FulfillmentOrder> => {
  const existing = await orderRepo().findOne({ where: { contractId: contract.id } });
  if (existing) return existing;

  const now = new Date();
  const stage = initialStage(contract);
  const row = orderRepo().create({
    contractId: contract.id,
    stage,
    carrier: 'ghn',
    reportIntervalDays: 7,
    nextReportDueAt: stage === 'cultivating' ? addDays(now, 7) : null,
    enterpriseReceivedAt: contract.deliveredAt || null,
    completedAt: contract.completedAt || null,
  });

  try {
    return await orderRepo().save(row);
  } catch (error: any) {
    if (error?.number === 2601 || error?.number === 2627) {
      const concurrent = await orderRepo().findOne({ where: { contractId: contract.id } });
      if (concurrent) return concurrent;
    }
    throw error;
  }
};

const assertParticipant = (order: FulfillmentOrder, userId: string) => {
  const contract = order.contract;
  if (!contract || (contract.farmerId !== userId && contract.enterpriseId !== userId)) {
    throw makeError('Bạn không có quyền truy cập đơn hàng này', 403);
  }
};

const loadOrder = async (orderId: string) => {
  const order = await orderRepo().findOne({
    where: { id: orderId },
    relations: ORDER_RELATIONS as any,
  });
  if (!order) throw makeError('Không tìm thấy đơn hàng', 404);
  return order;
};

const notifyOrderPartner = async (params: {
  order: FulfillmentOrder;
  recipientId: string;
  recipientRole: 'farmer' | 'enterprise';
  type: string;
  title: string;
  message: string;
  severity?: string;
}) => {
  const notifications = AppDataSource.getRepository(Notification);
  await notifications.save(notifications.create({
    userId: params.recipientId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedId: params.order.id,
    relatedModel: 'FulfillmentOrder',
    severity: params.severity || 'info',
    isRead: false,
    emailSent: false,
  }));

  const recipient = await AppDataSource.getRepository(User).findOne({ where: { id: params.recipientId } });
  if (recipient?.email) {
    try {
      await sendNotificationEmail(
        recipient.email,
        displayName(recipient),
        params.title,
        params.message,
        buildOrderUrl(params.recipientRole, params.order.id)
      );
    } catch {
      // Email là kênh phụ; thông báo trong hệ thống đã được lưu bền vững.
    }
  }
};

export const listOrdersForUser = async (
  userId: string,
  role: 'farmer' | 'enterprise',
  query: { page?: unknown; limit?: unknown; stage?: unknown }
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const statuses = ['active', 'completed'] as Contract['status'][];
  const contracts = await contractRepo().find({
    where: role === 'farmer'
      ? { farmerId: userId, status: In(statuses) }
      : { enterpriseId: userId, status: In(statuses) },
  });
  for (const contract of contracts) await ensureOrderForContract(contract);

  const qb = orderRepo()
    .createQueryBuilder('order')
    .innerJoinAndSelect('order.contract', 'contract')
    .leftJoinAndSelect('contract.product', 'product')
    .leftJoinAndSelect('contract.farmer', 'farmer')
    .leftJoinAndSelect('contract.enterprise', 'enterprise')
    .where(role === 'farmer' ? 'contract.farmerId = :userId' : 'contract.enterpriseId = :userId', { userId })
    .andWhere("contract.status IN ('active','completed')");

  const stage = String(query.stage || '').trim();
  if (stage && ['cultivating', 'ready_to_ship', 'in_transit', 'delivered', 'completed'].includes(stage)) {
    qb.andWhere('order.stage = :stage', { stage });
  }

  qb.orderBy('order.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);
  const [orders, total] = await qb.getManyAndCount();
  return { orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

export const getOrderDetail = async (orderId: string, userId: string) => {
  const order = await loadOrder(orderId);
  assertParticipant(order, userId);
  const [reports, trackingEvents] = await Promise.all([
    reportRepo().find({ where: { orderId }, order: { createdAt: 'DESC' } }),
    trackingRepo().find({ where: { orderId }, order: { occurredAt: 'DESC' } }),
  ]);
  return { order, reports, trackingEvents };
};

export const updateReportSchedule = async (orderId: string, farmerId: string, intervalDays: unknown) => {
  const order = await loadOrder(orderId);
  if (order.contract.farmerId !== farmerId) throw makeError('Chỉ nông dân mới có thể đặt lịch báo cáo', 403);
  if (order.stage !== 'cultivating') throw makeError('Chỉ có thể đặt lịch trong giai đoạn đang trồng', 409);
  const interval = Number(intervalDays);
  if (!Number.isInteger(interval) || interval < 1 || interval > 30) {
    throw makeError('Chu kỳ báo cáo phải từ 1 đến 30 ngày', 400);
  }
  order.reportIntervalDays = interval;
  order.nextReportDueAt = addDays(new Date(), interval);
  return orderRepo().save(order);
};

export const requestCropReport = async (
  orderId: string,
  enterpriseId: string,
  input: { title?: unknown; note?: unknown; dueAt?: unknown }
) => {
  const order = await loadOrder(orderId);
  if (order.contract.enterpriseId !== enterpriseId) throw makeError('Chỉ doanh nghiệp của đơn hàng mới được yêu cầu báo cáo', 403);
  if (order.stage !== 'cultivating') throw makeError('Đơn hàng không còn ở giai đoạn gieo trồng', 409);

  const title = cleanText(input.title, 200, 'Tiêu đề') || 'Yêu cầu cập nhật tình trạng gieo trồng';
  const note = cleanText(input.note, 1000, 'Nội dung yêu cầu');
  const rawDueAt = input.dueAt ? new Date(String(input.dueAt)) : addDays(new Date(), 3);
  if (Number.isNaN(rawDueAt.getTime()) || rawDueAt.getTime() <= Date.now()) {
    throw makeError('Hạn báo cáo phải là thời điểm trong tương lai', 400);
  }

  const report = await reportRepo().save(reportRepo().create({
    orderId,
    requestedBy: enterpriseId,
    requestType: 'enterprise',
    status: 'requested',
    title,
    requestNote: note,
    dueAt: rawDueAt,
  }));

  await notifyOrderPartner({
    order,
    recipientId: order.contract.farmerId,
    recipientRole: 'farmer',
    type: 'crop_report_requested',
    title: 'Doanh nghiệp yêu cầu báo cáo canh tác',
    message: `${title}. Hạn phản hồi ${rawDueAt.toLocaleDateString('vi-VN')}.`,
    severity: 'warning',
  });
  return report;
};

export const submitCropReport = async (
  orderId: string,
  farmerId: string,
  input: { reportId?: unknown; note?: unknown },
  imageUrls: string[]
) => {
  const order = await loadOrder(orderId);
  if (order.contract.farmerId !== farmerId) throw makeError('Chỉ nông dân của đơn hàng mới được gửi báo cáo', 403);
  if (order.stage !== 'cultivating') throw makeError('Đơn hàng không còn ở giai đoạn gieo trồng', 409);
  if (!imageUrls.length) throw makeError('Cần ít nhất một ảnh thực tế của nông sản', 400);

  let report: CropProgressReport | null = null;
  const reportId = String(input.reportId || '').trim();
  if (reportId) {
    report = await reportRepo().findOne({ where: { id: reportId, orderId } });
    if (!report) throw makeError('Không tìm thấy yêu cầu báo cáo', 404);
    if (report.status === 'submitted') throw makeError('Yêu cầu này đã được phản hồi', 409);
  }
  if (!report) {
    report = reportRepo().create({
      orderId,
      requestType: 'periodic',
      status: 'requested',
      title: 'Báo cáo canh tác định kỳ',
      dueAt: order.nextReportDueAt,
    });
  }

  const now = new Date();
  report.status = 'submitted';
  report.farmerNote = cleanText(input.note, 2000, 'Ghi chú của nông dân');
  report.imageUrlsJson = JSON.stringify(imageUrls);
  report.submittedAt = now;
  const saved = await reportRepo().save(report);
  order.nextReportDueAt = addDays(now, order.reportIntervalDays);
  await orderRepo().save(order);

  await notifyOrderPartner({
    order,
    recipientId: order.contract.enterpriseId,
    recipientRole: 'enterprise',
    type: 'crop_report_submitted',
    title: 'Nông dân đã gửi báo cáo canh tác',
    message: `Đã có ảnh thực tế mới cho đơn hàng ${order.contract.contractCode}.`,
    severity: 'info',
  });
  return saved;
};

export const markOrderReadyToShip = async (orderId: string, farmerId: string, note?: unknown) => {
  const order = await loadOrder(orderId);
  if (order.contract.farmerId !== farmerId) throw makeError('Chỉ nông dân của đơn hàng mới được thao tác', 403);
  if (order.stage === 'ready_to_ship') return order;
  if (order.stage !== 'cultivating') throw makeError('Trạng thái đơn hàng không cho phép chuẩn bị giao', 409);
  await markDirectContractPreparing(order.contractId, farmerId, cleanText(note, 500, 'Ghi chú') || undefined);
  order.stage = 'ready_to_ship';
  order.nextReportDueAt = null;
  return orderRepo().save(order);
};

export const handOrderToCarrier = async (
  orderId: string,
  farmerId: string,
  input: { carrier?: unknown; trackingCode?: unknown; note?: unknown },
  loadingPhotoUrl?: string
) => {
  const order = await loadOrder(orderId);
  if (order.contract.farmerId !== farmerId) throw makeError('Chỉ nông dân của đơn hàng mới được thao tác', 403);
  if (order.stage !== 'ready_to_ship') throw makeError('Đơn hàng chưa sẵn sàng bàn giao vận chuyển', 409);
  if (!loadingPhotoUrl) throw makeError('Cần ảnh xác nhận hàng đã được đưa lên xe', 400);
  const trackingCode = cleanText(input.trackingCode, 100, 'Mã vận đơn', true)!;
  const carrier = String(input.carrier || 'ghn').toLowerCase();
  if (!['ghn', 'manual'].includes(carrier)) throw makeError('Đơn vị vận chuyển không hợp lệ', 400);

  await markDirectContractShipped(order.contractId, farmerId, cleanText(input.note, 500, 'Ghi chú') || undefined);
  const now = new Date();
  order.stage = 'in_transit';
  order.carrier = carrier as 'ghn' | 'manual';
  order.trackingCode = trackingCode;
  order.loadingPhotoUrl = loadingPhotoUrl;
  order.carrierStatus = 'handed_to_carrier';
  order.handedToCarrierAt = now;
  await orderRepo().save(order);
  await trackingRepo().save(trackingRepo().create({
    orderId,
    source: 'manual',
    status: 'handed_to_carrier',
    description: 'Nông dân đã bàn giao hàng cho đơn vị vận chuyển.',
    location: order.contract.farmLocation || null,
    occurredAt: now,
  }));

  await notifyOrderPartner({
    order,
    recipientId: order.contract.enterpriseId,
    recipientRole: 'enterprise',
    type: 'order_handed_to_carrier',
    title: 'Đơn hàng đã được bàn giao vận chuyển',
    message: `Mã vận đơn ${trackingCode} đã được ghi nhận cho hợp đồng ${order.contract.contractCode}.`,
  });
  return order;
};

export const confirmOrderReceived = async (orderId: string, enterpriseId: string, note?: unknown) => {
  const order = await loadOrder(orderId);
  if (order.contract.enterpriseId !== enterpriseId) throw makeError('Chỉ doanh nghiệp của đơn hàng mới được xác nhận nhận hàng', 403);
  if (order.stage === 'delivered' || order.stage === 'completed') return order;
  if (order.stage !== 'in_transit') throw makeError('Đơn hàng chưa ở trạng thái đang vận chuyển', 409);

  await acceptDirectContractDelivery(order.contractId, enterpriseId, cleanText(note, 500, 'Ghi chú') || undefined);
  const now = new Date();
  order.stage = 'delivered';
  order.enterpriseReceivedAt = now;
  await orderRepo().save(order);
  await trackingRepo().save(trackingRepo().create({
    orderId,
    source: 'manual',
    status: 'enterprise_received',
    description: 'Doanh nghiệp đã xác nhận nhận đủ hàng.',
    location: order.contract.deliveryAddress || null,
    occurredAt: now,
  }));
  return order;
};

export const completeOrderContract = async (orderId: string, enterpriseId: string) => {
  const order = await loadOrder(orderId);
  if (order.contract.enterpriseId !== enterpriseId) throw makeError('Chỉ doanh nghiệp của đơn hàng mới được hoàn tất hợp đồng', 403);
  if (order.stage === 'completed' && order.contract.status === 'completed') return order;
  if (order.stage !== 'delivered' || !order.enterpriseReceivedAt) {
    throw makeError('Doanh nghiệp cần xác nhận đã nhận hàng trước', 409);
  }
  const contract = await contractRepo().findOne({ where: { id: order.contractId } });
  if (!contract || contract.status !== 'active') throw makeError('Hợp đồng không ở trạng thái có thể hoàn tất', 409);
  if (Number(contract.remainingAmount || 0) > 0) {
    throw makeError('Cần hoàn tất toàn bộ thanh toán trước khi kết thúc hợp đồng', 409);
  }

  const now = new Date();
  contract.status = 'completed';
  contract.completedAt = now;
  contract.updatedBy = enterpriseId;
  order.stage = 'completed';
  order.completedAt = now;
  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(Contract).save(contract);
    await manager.getRepository(FulfillmentOrder).save(order);
  });

  await notifyOrderPartner({
    order,
    recipientId: contract.farmerId,
    recipientRole: 'farmer',
    type: 'order_contract_completed',
    title: 'Hợp đồng đã hoàn tất',
    message: `Doanh nghiệp đã hoàn tất hợp đồng ${contract.contractCode}.`,
    severity: 'info',
  });
  return order;
};

export const recordGhnTrackingEvent = async (event: NormalizedGhnEvent) => {
  const order = await orderRepo().findOne({
    where: { trackingCode: event.trackingCode },
    relations: ORDER_RELATIONS as any,
  });
  if (!order) throw makeError('Không tìm thấy đơn hàng theo mã GHN', 404);

  const duplicate = await trackingRepo().findOne({ where: { providerEventId: event.providerEventId } });
  if (duplicate) return { order, event: duplicate, duplicate: true };

  const savedEvent = await trackingRepo().save(trackingRepo().create({
    orderId: order.id,
    providerEventId: event.providerEventId,
    source: 'ghn',
    status: event.status,
    description: event.description,
    location: event.location,
    latitude: event.latitude,
    longitude: event.longitude,
    occurredAt: event.occurredAt,
    rawPayload: event.rawPayload,
  }));
  order.carrierStatus = event.status;
  order.lastCarrierSyncAt = new Date();
  if (event.location) order.currentLocation = event.location;
  if (event.latitude !== null) order.currentLatitude = event.latitude;
  if (event.longitude !== null) order.currentLongitude = event.longitude;
  await orderRepo().save(order);

  if (GHN_DELIVERED_STATUSES.has(event.status)) {
    await notifyOrderPartner({
      order,
      recipientId: order.contract.enterpriseId,
      recipientRole: 'enterprise',
      type: 'ghn_delivery_arrived',
      title: 'GHN báo giao hàng thành công',
      message: `GHN đã cập nhật mã ${event.trackingCode} là đã giao. Vui lòng kiểm tra hàng và xác nhận đã nhận trên PreOnic.`,
      severity: 'info',
    });
  }
  return { order, event: savedEvent, duplicate: false };
};

export const createDuePeriodicCropRequests = async () => {
  const now = new Date();
  const dueOrders = await orderRepo()
    .createQueryBuilder('order')
    .innerJoinAndSelect('order.contract', 'contract')
    .where("order.stage = 'cultivating'")
    .andWhere('order.nextReportDueAt IS NOT NULL')
    .andWhere('order.nextReportDueAt <= :now', { now })
    .getMany();

  let created = 0;
  for (const order of dueOrders) {
    const existing = await reportRepo()
      .createQueryBuilder('report')
      .where('report.orderId = :orderId', { orderId: order.id })
      .andWhere("report.requestType = 'periodic'")
      .andWhere("report.status = 'requested'")
      .getOne();
    if (!existing) {
      await reportRepo().save(reportRepo().create({
        orderId: order.id,
        requestType: 'periodic',
        status: 'requested',
        title: 'Đến kỳ cập nhật tình trạng gieo trồng',
        dueAt: addDays(now, 2),
      }));
      await notifyOrderPartner({
        order,
        recipientId: order.contract.farmerId,
        recipientRole: 'farmer',
        type: 'crop_report_periodic_due',
        title: 'Đến kỳ báo cáo canh tác',
        message: `Vui lòng chụp ảnh thực tế và cập nhật tình trạng đơn hàng ${order.contract.contractCode}.`,
        severity: 'warning',
      });
      created += 1;
    }
    order.nextReportDueAt = addDays(now, order.reportIntervalDays);
    await orderRepo().save(order);
  }
  return created;
};
