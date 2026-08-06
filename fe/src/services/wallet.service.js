import api from './api';

/**
 * Wallet Service - Handle virtual wallet API calls
 */
const walletService = {
  /**
   * Get wallet overview (balance) for the current user
   */
  get: async () => {
    try {
      const response = await api.get('/wallet');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy thông tin ví thất bại' };
    }
  },

  /**
   * List wallet transactions (topups + escrow deposits/releases) for the current user
   */
  listTransactions: async (params = {}) => {
    try {
      const response = await api.get('/wallet/transactions', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy lịch sử giao dịch thất bại' };
    }
  },

  /**
   * Enterprise transaction overview: wallet + contracts + escrow chart/table
   */
  overviewTransactions: async (params = {}) => {
    try {
      const response = await api.get('/wallet/transactions/overview', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy tổng quan giao dịch thất bại' };
    }
  },

  /**
   * Demo top-up (enterprise only) — adds funds instantly, no real payment gateway
   */
  demoTopup: async (amount, note) => {
    try {
      const response = await api.post('/wallet/topup', { amount, note });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Nạp tiền thất bại' };
    }
  },

  /**
   * Create a SePay bank-transfer top-up order (bank info + QR + transfer content)
   */
  createSepayOrder: async (amount) => {
    try {
      const response = await api.post('/wallet/topup/sepay/create', { amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Tạo lệnh SePay thất bại' };
    }
  },

  /**
   * Poll the status of a SePay top-up order (pending | completed)
   */
  getSepayOrderStatus: async (orderCode) => {
    try {
      const response = await api.get(`/wallet/topup/sepay/${orderCode}/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy trạng thái lệnh nạp tiền thất bại' };
    }
  },

  /**
   * Create a fake QR top-up order for demo — same UI as SePay but no real bank/webhook needed
   */
  createDemoQrOrder: async (amount) => {
    try {
      const response = await api.post('/wallet/topup/sepay/demo/create', { amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Tạo lệnh QR demo thất bại' };
    }
  },

  /**
   * Simulate the bank/SePay confirmation for a demo QR order
   */
  confirmDemoQrOrder: async (orderCode) => {
    try {
      const response = await api.post(`/wallet/topup/sepay/demo/${orderCode}/confirm`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Xác nhận nạp tiền demo thất bại' };
    }
  },

  /**
   * Demo withdraw — deducts funds from the wallet instantly, no real bank transfer
   */
  demoWithdraw: async (amount, note) => {
    try {
      const response = await api.post('/wallet/withdraw', { amount, note });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Rút tiền thất bại' };
    }
  },
};

export default walletService;
