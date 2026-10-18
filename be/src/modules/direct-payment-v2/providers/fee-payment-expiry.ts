export const getFeePaymentQrTtlMinutes = (): number => {
  const value = Number(process.env.FEE_PAYMENT_QR_TTL_MINUTES || 10);
  if (!Number.isInteger(value) || value < 5 || value > 60) {
    throw new Error('FEE_PAYMENT_QR_TTL_MINUTES must be between 5 and 60');
  }
  return value;
};

export const buildFeePaymentQrExpiry = (nowMs = Date.now()): Date =>
  new Date(nowMs + getFeePaymentQrTtlMinutes() * 60 * 1000);
