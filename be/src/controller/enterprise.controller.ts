import { Response } from 'express';
import { AuthRequest } from '../types';
import * as enterpriseService from '../services/enterprise.service';

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await enterpriseService.getSuppliers(req.user!.id);

    res.status(200).json({
      success: true,
      data: { suppliers },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay danh sach nha cung cap that bai',
    });
  }
};

export const getSupplierDetail = async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await enterpriseService.getSupplierDetail(req.user!.id, req.params.farmerId);

    res.status(200).json({
      success: true,
      data: { supplier },
    });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Lay thong tin nha cung cap that bai',
    });
  }
};
