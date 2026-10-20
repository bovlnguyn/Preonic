export const getDirectPaymentQrTtlMinutes = (): number => {
  const value = Number(process.env.DIRECT_PAYMENT_QR_TTL_MINUTES || 10);
  if (!Number.isInteger(value) || value < 5 || value > 60) {
    throw new Error('DIRECT_PAYMENT_QR_TTL_MINUTES must be between 5 and 60');
  }
  return value;
};

export const buildDirectPaymentQrExpiry = (nowMs = Date.now()): Date =>
  new Date(nowMs + getDirectPaymentQrTtlMinutes() * 60 * 1000);
