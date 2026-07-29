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
};

export default walletService;
