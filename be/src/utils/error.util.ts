// makeError() dùng chung cho các service nghiệp vụ.
export const makeError = (message: string, statusCode = 400) => {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  return err;
};
