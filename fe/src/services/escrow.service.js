import api from './api';

/**
 * Escrow Service - Handle escrow (ký quỹ) API calls
 */
const escrowService = {
  /**
   * List escrows for the current user (farmer or enterprise)
   */
  list: async (params = {}) => {
    try {
      const normalized = { ...params };
      if (Array.isArray(normalized.contractIds)) normalized.contractIds = normalized.contractIds.join(',');
      const response = await api.get('/escrow', { params: normalized });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách ký quỹ thất bại' };
    }
  },


  /**
   * Lightweight KPI summary for dashboard/overview. Does not load milestones.
   */
  summary: async () => {
    try {
      const response = await api.get('/escrow/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy tổng quan ký quỹ thất bại' };
    }
  },

  /**
   * Get escrow detail (with milestones) for a contract
   */
  getByContract: async (contractId) => {
    try {
      const response = await api.get(`/escrow/${contractId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy thông tin ký quỹ thất bại' };
    }
  },

  /**
   * Enterprise deposits the full contract value into escrow
   */
  deposit: async (contractId) => {
    try {
      const response = await api.post(`/escrow/${contractId}/deposit`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Nạp ký quỹ thất bại' };
    }
  },

  /**
   * Confirm a milestone step (farmer or enterprise, depending on the step)
   */
  confirmMilestone: async (contractId, step, evidence) => {
    try {
      const body = evidence ? { evidence } : {};
      const response = await api.post(`/escrow/${contractId}/milestones/${step}/confirm`, body);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Xác nhận mốc thanh toán thất bại' };
    }
  },
};

export default escrowService;
