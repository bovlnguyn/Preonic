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

  getCashflowReport: (months = 12) =>
    unwrap(api.get('/billing/cashflow-report', { params: { months } }), 'Không thể tải báo cáo dòng tiền'),

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

  getActiveFeePayment: () =>
    unwrap(api.get('/billing/fee-payments/active'), 'Không thể tải mã thanh toán đang hoạt động'),

  listSettlementAccounts: () =>
    unwrap(api.get('/billing/settlement-accounts'), 'Không thể tải tài khoản nhận tiền'),

  saveSettlementAccount: (payload) =>
    unwrap(api.post('/billing/settlement-accounts', payload), 'Không thể lưu tài khoản nhận tiền'),

  verifySettlementAccount: (payload) =>
    unwrap(api.post('/billing/settlement-accounts/verify', payload), 'Không thể xác minh tài khoản ngân hàng'),

  reverifySettlementAccount: (id) =>
    unwrap(api.post(`/billing/settlement-accounts/${id}/verify`), 'Không thể xác minh lại tài khoản ngân hàng'),

  setDefaultSettlementAccount: (id) =>
    unwrap(api.patch(`/billing/settlement-accounts/${id}/default`), 'Không thể đặt tài khoản mặc định'),

  disableSettlementAccount: (id) =>
    unwrap(api.delete(`/billing/settlement-accounts/${id}`), 'Không thể vô hiệu hóa tài khoản'),
};

export default billingService;
