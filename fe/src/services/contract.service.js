import api from './api';

/**
 * Contract Service - Handle contract API calls
 */
const contractService = {
  /**
   * Create a new contract
   */
  create: async (data) => {
    try {
      const response = await api.post('/contracts', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Tạo hợp đồng thất bại' };
    }
  },

  /**
   * List user's contracts
   */
  list: async (status, extraParams = {}) => {
    try {
      const params = { ...(status ? { status } : {}), ...extraParams };
      const response = await api.get('/contracts', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách hợp đồng thất bại' };
    }
  },

  /**
   * Get user's contract summary
   */
  summary: async () => {
    try {
      const response = await api.get('/contracts/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy tổng quan hợp đồng thất bại' };
    }
  },

  /**
   * Get contract by ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/contracts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy hợp đồng thất bại' };
    }
  },

  /**
   * Submit a draft contract to the farmer (enterprise only) — draft -> pending
   */
  submit: async (id) => {
    try {
      const response = await api.post(`/contracts/${id}/submit`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Gửi đề xuất hợp đồng thất bại' };
    }
  },

  /**
   * Request OTP for signing (enterprise only)
   */
  requestSignOtp: async (id) => {
    try {
      const response = await api.post(`/contracts/${id}/request-sign-otp`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Gửi mã OTP thất bại' };
    }
  },

  /**
   * Sign a contract. Enterprise must supply otp; farmer can omit it.
   */
  sign: async (id, otp) => {
    try {
      const body = otp ? { otp } : {};
      const response = await api.post(`/contracts/${id}/sign`, body);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Ký hợp đồng thất bại' };
    }
  },

  /**
   * Cancel a contract
   */
  cancel: async (id, reason) => {
    try {
      const response = await api.post(`/contracts/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Hủy hợp đồng thất bại' };
    }
  },

  /**
   * Reject a contract (farmer rejects before signing)
   */
  reject: async (id, reason) => {
    try {
      const response = await api.post(`/contracts/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Từ chối hợp đồng thất bại' };
    }
  },
  confirmCancel: async (id) => {
    try {
      const response = await api.post(`/contracts/${id}/confirm-cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Xác nhận hủy thất bại' };
    }
  },

  /**
   * Decline a cancel request (the non-requesting party keeps the contract active)
   */
  declineCancel: async (id) => {
    try {
      const response = await api.post(`/contracts/${id}/decline-cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Từ chối yêu cầu hủy thất bại' };
    }
  },
};

export default contractService;
