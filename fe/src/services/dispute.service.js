import api from './api';

/**
 * Dispute Service - Handle dispute (tranh chấp) API calls
 */
const disputeService = {
  /**
   * Create a dispute for a contract, optionally scoped to a milestone step,
   * with a reason (10-2000 chars) and evidence files (jpg/png/pdf, max 5MB each).
   */
  create: async ({ contractId, milestoneStep, reason }, files = []) => {
    try {
      const formData = new FormData();
      formData.append('contractId', contractId);
      if (milestoneStep !== undefined && milestoneStep !== null) {
        formData.append('milestoneStep', milestoneStep);
      }
      formData.append('reason', reason);
      files.forEach((file) => formData.append('evidences', file));

      const response = await api.post('/disputes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Tạo tranh chấp thất bại' };
    }
  },

  /**
   * List disputes involving the current user
   */
  list: async (status) => {
    try {
      const response = await api.get('/disputes', { params: status ? { status } : {} });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy danh sách tranh chấp thất bại' };
    }
  },

  /**
   * Get a single dispute by id
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/disputes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Lấy tranh chấp thất bại' };
    }
  },
};

export default disputeService;
