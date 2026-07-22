import { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import { AuthRequest } from '../types';

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
