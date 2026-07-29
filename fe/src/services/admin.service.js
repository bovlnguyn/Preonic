import api from './api';

// ════════════════════════════════════════
// MOCK DATA — Rút tiền: chưa có backend thật, giữ mock cho tới khi có API riêng
// ════════════════════════════════════════

const MOCK_WITHDRAWALS = Array.from({ length: 4 }).map((_, i) => ({
  _id: `w${i + 1}`,
  userId: { fullName: `Người dùng ${i + 1}`, email: `user${i + 1}@gmail.com`, virtualBalance: 12000000 },
  amount: 2000000 + i * 500000,
  bankName: 'Vietcombank',
  bankAccountNumber: '0123456789',
  bankAccountHolder: `NGUOI DUNG ${i + 1}`,
  note: '',
  status: i === 0 ? 'pending' : ['pending', 'completed', 'rejected'][i % 3],
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
}));

// ════════════════════════════════════════
// Helper — giả lập delay network
// ════════════════════════════════════════
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

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

  // ── Withdrawals ──
  getWithdrawals: async (params = {}) => {
    await delay();
    let list = [...MOCK_WITHDRAWALS];
    if (params.status) list = list.filter(w => w.status === params.status);
    const start = ((params.page || 1) - 1) * (params.limit || 20);
    const data = list.slice(start, start + (params.limit || 20));
    return {
      success: true,
      data: {
        requests: data,
        page: params.page || 1,
        total: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / (params.limit || 20))),
      },
    };
  },

  completeWithdrawal: async (id) => {
    await delay(400);
    const r = MOCK_WITHDRAWALS.find(w => w._id === id);
    if (r) r.status = 'completed';
    return { success: true };
  },

  rejectWithdrawal: async (id, reason) => {
    await delay(400);
    const r = MOCK_WITHDRAWALS.find(w => w._id === id);
    if (r) { r.status = 'rejected'; r.rejectReason = reason; }
    return { success: true };
  },
};

export default adminService;