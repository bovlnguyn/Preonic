import api from './api';

const unwrap = (promise, fallback) =>
  promise
    .then((response) => response.data)
    .catch((error) => {
      throw error.response?.data || { success: false, message: fallback };
    });

const billingService = {
  getAccount: () =>
    unwrap(api.get('/billing/account'), 'Không thể tải công nợ phí'),

  listStatements: (params = {}) =>
    unwrap(api.get('/billing/statements', { params }), 'Không thể tải bảng kê phí'),

  createFeePayment: ({ amount, statementId, idempotencyKey }) =>
    unwrap(
      api.post(
        '/billing/fee-payments',
        {
          ...(amount ? { amount } : {}),
          ...(statementId ? { statementId } : {}),
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      ),
      'Không thể tạo thanh toán phí'
    ),

  getFeePayment: (id) =>
    unwrap(api.get(`/billing/fee-payments/${id}`), 'Không thể tải giao dịch phí'),

  listSettlementAccounts: () =>
    unwrap(api.get('/billing/settlement-accounts'), 'Không thể tải tài khoản nhận tiền'),

  saveSettlementAccount: (payload) =>
    unwrap(api.post('/billing/settlement-accounts', payload), 'Không thể lưu tài khoản nhận tiền'),

  setDefaultSettlementAccount: (id) =>
    unwrap(api.patch(`/billing/settlement-accounts/${id}/default`), 'Không thể đặt tài khoản mặc định'),

  disableSettlementAccount: (id) =>
    unwrap(api.delete(`/billing/settlement-accounts/${id}`), 'Không thể vô hiệu hóa tài khoản'),
};

export default billingService;
