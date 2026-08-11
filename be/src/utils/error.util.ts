// makeError() dùng chung cho các service — trước đây bị copy y hệt trong
// contract.service.ts và escrow.service.ts.
export const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};
