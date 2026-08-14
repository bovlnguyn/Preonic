import { Response } from 'express';
import { AuthRequest } from '../types';
import * as enterpriseService from '../services/enterprise.service';
import { sendError } from '../utils/controller.util';

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await enterpriseService.getSuppliers(req.user!.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: { suppliers: result.suppliers, pagination: result.pagination },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay danh sach nha cung cap that bai');
  }
};

export const getSupplierDetail = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await enterpriseService.getSupplierDetail(req.user!.id, req.params.farmerId, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: { supplier },
    });
  } catch (err: any) {
    sendError(res, err, 'Lay thong tin nha cung cap that bai');
  }
};
