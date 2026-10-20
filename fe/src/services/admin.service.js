import api from './api';

// React StrictMode mounts effects twice in development. Reuse an identical GET
// while it is still in flight so admin pages do not issue duplicate database
// queries or duplicate error log entries.
const pendingGets = new Map();

const getRequestKey = (path, params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `${path}?${query}` : path;
};

const getOnce = (path, params = {}) => {
  const key = getRequestKey(path, params);
  const pending = pendingGets.get(key);
  if (pending) return pending;

  const request = api.get(path, { params })
    .then((response) => response.data)
    .finally(() => pendingGets.delete(key));
  pendingGets.set(key, request);
  return request;
};

// ════════════════════════════════════════
// adminService
// ════════════════════════════════════════
const adminService = {
  // ── Dashboard ──
  getDashboard: () => getOnce('/admin/dashboard'),

  // ── Users ──
  getUsers: (params = {}) => getOnce('/admin/users', params),

  getUserDetail: (userId) => getOnce(`/admin/users/${userId}`),

  toggleUserStatus: async (userId) => {
    const response = await api.patch(`/admin/users/${userId}/toggle-status`);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // ── Contracts ──
  getContracts: (params = {}) => getOnce('/admin/contracts', params),

  getContractDetail: (contractId) => getOnce(`/admin/contracts/${contractId}`),

  // ── Disputes ──
  getDisputes: (params = {}) => getOnce('/admin/disputes', params),

  getDisputeDetail: (id) => getOnce(`/admin/disputes/${id}`),

  resolveDispute: async (id, resolution, adminNotes) => {
    const response = await api.patch(`/admin/disputes/${id}/resolve`, { resolution, adminNotes });
    return response.data;
  },

  // ── Transactions ──
  getTransactions: (params = {}) => getOnce('/admin/transactions', params),

  // ── Platform fees ──
  getFees: (params = {}) => getOnce('/admin/fees', params),

  // ── Farmer settlement account verification ──
  getSettlementAccountReviews: (params = {}) => getOnce('/admin/settlement-account-reviews', params),

  reviewSettlementAccount: async (id, decision, note = '') => {
    const response = await api.patch(`/admin/settlement-account-reviews/${id}`, { decision, note });
    return response.data;
  },

  verifySettlementAccountOnSePay: async (id) => {
    const response = await api.post(`/admin/settlement-account-reviews/${id}/verify-sepay`);
    return response.data;
  },

  // ── System Logs ──
  getSystemLogs: (params = {}) => getOnce('/admin/system-logs', params),

  getSystemLogDetail: (id) => getOnce(`/admin/system-logs/${id}`),

};

export default adminService;
