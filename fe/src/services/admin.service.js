import api from './api';

// ════════════════════════════════════════
// adminService
// ════════════════════════════════════════
const adminService = {
  // ── Dashboard ──
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // ── Users ──
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserDetail: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  toggleUserStatus: async (userId) => {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // ── Contracts ──
  getContracts: async (params = {}) => {
    const response = await api.get('/admin/contracts', { params });
    return response.data;
  },

  getContractDetail: async (contractId) => {
    const response = await api.get(`/admin/contracts/${contractId}`);
    return response.data;
  },

  // ── Disputes ──
  getDisputes: async (params = {}) => {
    const response = await api.get('/admin/disputes', { params });
    return response.data;
  },

  getDisputeDetail: async (id) => {
    const response = await api.get(`/admin/disputes/${id}`);
    return response.data;
  },

  resolveDispute: async (id, resolution, adminNotes) => {
    const response = await api.patch(`/admin/disputes/${id}/resolve`, { resolution, adminNotes });
    return response.data;
  },

  // ── Transactions ──
  getTransactions: async (params = {}) => {
    const response = await api.get('/admin/transactions', { params });
    return response.data;
  },

  // ── Commissions ──
  getCommissions: async (params = {}) => {
    const response = await api.get('/admin/commissions', { params });
    return response.data;
  },

  // ── System Logs ──
  getSystemLogs: async (params = {}) => {
    const response = await api.get('/admin/system-logs', { params });
    return response.data;
  },

  getSystemLogDetail: async (id) => {
    const response = await api.get(`/admin/system-logs/${id}`);
    return response.data;
  },

  // ── Withdrawals ──
  getWithdrawals: async (params = {}) => {
    const response = await api.get('/admin/withdrawals', { params });
    return response.data;
  },

  completeWithdrawal: async (id) => {
    const response = await api.patch(`/admin/withdrawals/${id}/complete`);
    return response.data;
  },

  rejectWithdrawal: async (id, reason) => {
    const response = await api.patch(`/admin/withdrawals/${id}/reject`, { reason });
    return response.data;
  },
};

export default adminService;