import { Response } from 'express';

// Khoi catch(err) lap lai giong het nhau o tat ca controller (contract, escrow, auth...):
// tra ve err.statusCode (mac dinh fallbackStatus) kem message loi hoac message mac dinh.
export const sendError = (
  res: Response,
  err: any,
  fallbackMessage: string,
  fallbackStatus = 500
) => {
  res.status(err?.statusCode || fallbackStatus).json({
    success: false,
    message: err?.message || fallbackMessage,
  });
};
