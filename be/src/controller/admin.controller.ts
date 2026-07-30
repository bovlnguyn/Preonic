import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import { AuthRequest } from '../types';

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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy danh sách người dùng thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy chi tiết người dùng thất bại',
    });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await adminService.toggleUserStatus(req.params.id);
    res.status(200).json({
      success: true,
      data: { user: result.user },
      message: result.user.isActive ? 'Tài khoản đã được kích hoạt' : 'Tài khoản đã bị vô hiệu hóa',
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Cập nhật trạng thái tài khoản thất bại',
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    await adminService.deleteUser(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Xóa người dùng thất bại',
    });
  }
};

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const result = await adminService.getDashboardStats();
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy dữ liệu tổng quan thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy danh sách hợp đồng thất bại',
    });
  }
};

export const getContractDetail = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getContractDetail(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy chi tiết hợp đồng thất bại',
    });
  }
};

export const getDisputes = async (req: Request, res: Response) => {
  try {
    const { page, limit, status } = req.query;
    const result = await adminService.getDisputes({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string,
    });

    res.status(200).json({
      success: true,
      data: result.disputes.map(formatDisputeForAdmin),
      pagination: result.pagination,
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy danh sách khiếu nại thất bại',
    });
  }
};

export const getDisputeDetail = async (req: Request, res: Response) => {
  try {
    const dispute = await adminService.getDisputeDetail(req.params.id);
    res.status(200).json({ success: true, data: { dispute: formatDisputeForAdmin(dispute) } });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy chi tiết khiếu nại thất bại',
    });
  }
};

export const resolveDispute = async (req: AuthRequest, res: Response) => {
  try {
    const dispute = await adminService.resolveDispute(
      req.params.id,
      req.body.resolution,
      req.body.adminNotes
    );
    res.status(200).json({
      success: true,
      data: { dispute: formatDisputeForAdmin(dispute) },
      message: 'Đã giải quyết khiếu nại thành công',
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Giải quyết khiếu nại thất bại',
    });
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
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lấy danh sách giao dịch thất bại',
    });
  }
};
