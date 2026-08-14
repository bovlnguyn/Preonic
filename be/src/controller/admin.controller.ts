import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import * as systemLogService from '../services/systemLog.service';
import { AuthRequest } from '../types';
import { sendError } from '../utils/controller.util';

const safeParseJson = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const formatSystemLogForAdmin = (item: any) => ({
  id: item.id,
  category: item.category,
  action: item.action,
  level: item.level,
  message: item.message,
  user: item.user
    ? { id: item.user.id, fullName: item.user.fullName, email: item.user.email }
    : null,
  targetType: item.targetType,
  targetId: item.targetId,
  metadata: safeParseJson(item.metadata),
  stackTrace: item.stackTrace,
  ipAddress: item.ipAddress,
  createdAt: item.createdAt,
});

const formatDisputeForAdmin = (dispute: any) => ({
  id: dispute.id,
  contractId: dispute.contract
    ? {
        id: dispute.contract.id,
        contractCode: dispute.contract.contractCode,
        totalValue: Number(dispute.contract.totalValue || 0),
        farmerName: dispute.contract.farmerName,
        enterpriseName: dispute.contract.enterpriseName,
      }
    : null,
  raisedBy: dispute.raisedByUser
    ? { id: dispute.raisedByUser.id, fullName: dispute.raisedByUser.fullName, email: dispute.raisedByUser.email }
    : null,
  raisedByRole: dispute.raisedByRole,
  againstUserId: dispute.againstUser
    ? { id: dispute.againstUser.id, fullName: dispute.againstUser.fullName, email: dispute.againstUser.email }
    : null,
  reason: dispute.reason,
  status: dispute.status,
  milestoneStep: dispute.milestoneStep,
  adminNotes: dispute.adminNotes,
  resolution: dispute.resolution,
  resolvedAt: dispute.resolvedAt,
  evidence: (dispute.evidences || []).map((e: any) => e.fileUrl),
  createdAt: dispute.createdAt,
});

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, role, isActive } = req.query;
    const result = await adminService.getUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      role: role as string,
      isActive: isActive as string,
    });

    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách người dùng thất bại');
  }
};

export const getUserDetail = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getUserDetail(req.params.id);
    res.status(200).json({
      success: true,
      data: { user: result.user, contractCount: result.contractCount, transactionCount: result.transactionCount },
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy chi tiết người dùng thất bại');
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminService.toggleUserStatus(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      data: { user: result.user },
      message: result.user.isActive ? 'Tài khoản đã được kích hoạt' : 'Tài khoản đã bị vô hiệu hóa',
    });
  } catch (err: any) {
    sendError(res, err, 'Cập nhật trạng thái tài khoản thất bại');
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminService.deleteUser(req.params.id, req.user?.id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Tài khoản đã được vô hiệu hóa an toàn. Dữ liệu hợp đồng và lịch sử vẫn được giữ nguyên.',
    });
  } catch (err: any) {
    sendError(res, err, 'Xóa người dùng thất bại');
  }
};

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const result = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    sendError(res, err, 'Lấy dữ liệu tổng quan thất bại');
  }
};

export const getContracts = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await adminService.getContracts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: result.contracts,
      pagination: result.pagination,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách hợp đồng thất bại');
  }
};

export const getContractDetail = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getContractDetail(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    sendError(res, err, 'Lấy chi tiết hợp đồng thất bại');
  }
};

export const getDisputes = async (req: Request, res: Response) => {
  try {
    const { page, limit, status, search } = req.query;
    const result = await adminService.getDisputes({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
      search: search as string,
    });

    res.status(200).json({
      success: true,
      data: result.disputes.map(formatDisputeForAdmin),
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách khiếu nại thất bại');
  }
};

export const getDisputeDetail = async (req: Request, res: Response) => {
  try {
    const dispute = await adminService.getDisputeDetail(req.params.id);
    res.status(200).json({ success: true, data: { dispute: formatDisputeForAdmin(dispute) } });
  } catch (err: any) {
    sendError(res, err, 'Lấy chi tiết khiếu nại thất bại');
  }
};

export const resolveDispute = async (req: AuthRequest, res: Response) => {
  try {
    const dispute = await adminService.resolveDispute(
      req.params.id,
      req.body.resolution,
      req.body.adminNotes,
      req.user?.id
    );
    res.status(200).json({
      success: true,
      data: { dispute: formatDisputeForAdmin(dispute) },
      message: 'Đã giải quyết khiếu nại thành công',
    });
  } catch (err: any) {
    sendError(res, err, 'Giải quyết khiếu nại thất bại');
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const { page, limit, type, status } = req.query;
    const result = await adminService.getTransactions({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type as string,
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách giao dịch thất bại');
  }
};

export const getCommissions = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await adminService.getCommissions({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: result.commissions,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy danh sách hoa hồng thất bại');
  }
};

export const getSystemLogs = async (req: Request, res: Response) => {
  try {
    const { page, limit, category, level, userId, from, to, search } = req.query;
    const result = await systemLogService.getSystemLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      category: category as string,
      level: level as string,
      userId: userId as string,
      from: from as string,
      to: to as string,
      search: search as string,
    });

    res.status(200).json({
      success: true,
      data: result.logs.map(formatSystemLogForAdmin),
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (err: any) {
    sendError(res, err, 'Lấy nhật ký hệ thống thất bại');
  }
};

export const getSystemLogDetail = async (req: Request, res: Response) => {
  try {
    const item = await systemLogService.getSystemLogById(Number(req.params.id));
    if (!item) {
      res.status(404).json({ success: false, message: 'Không tìm thấy log' });
      return;
    }
    res.status(200).json({ success: true, data: formatSystemLogForAdmin(item) });
  } catch (err: any) {
    sendError(res, err, 'Lấy chi tiết log thất bại');
  }
};
