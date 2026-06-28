import api from './api';

// ════════════════════════════════════════
// MOCK DATA — sẽ thay bằng API thật khi BE có
// ════════════════════════════════════════

const MOCK_DASHBOARD = {
  stats: {
    totalUsers: 128,
    totalFarmers: 84,
    totalEnterprises: 44,
    totalContracts: 56,
    activeContracts: 21,
    completedContracts: 30,
    cancelledContracts: 5,
    openDisputes: 3,
    totalTransactions: 312,
    totalTopupRevenue: 458000000,
  },
  monthlyUserData: [
    { month: 'T1', count: 12 },
    { month: 'T2', count: 18 },
    { month: 'T3', count: 22 },
    { month: 'T4', count: 15 },
    { month: 'T5', count: 28 },
    { month: 'T6', count: 33 },
  ],
  recentUsers: [
    { _id: 'u1', fullName: 'Nguyễn Văn An', email: 'an@gmail.com', role: 'farmer' },
    { _id: 'u2', fullName: 'Công ty ABC', email: 'abc@company.com', role: 'enterprise' },
    { _id: 'u3', fullName: 'Trần Thị Bình', email: 'binh@gmail.com', role: 'farmer' },
  ],
  recentContracts: [
    { _id: 'c1', contractCode: 'HD-0012', totalValue: 25000000, farmerName: 'Nguyễn Văn An', enterpriseName: 'Công ty ABC' },
    { _id: 'c2', contractCode: 'HD-0013', totalValue: 18500000, farmerName: 'Trần Thị Bình', enterpriseName: 'Công ty XYZ' },
  ],
};

const MOCK_USERS = Array.from({ length: 8 }).map((_, i) => ({
  _id: `u${i + 1}`,
  fullName: i % 2 === 0 ? `Nông dân ${i + 1}` : `Doanh nghiệp ${i + 1}`,
  email: `user${i + 1}@gmail.com`,
  role: i % 2 === 0 ? 'farmer' : 'enterprise',
  isActive: i % 5 !== 0,
  isVerified: true,
  phone: '0901234567',
  province: 'Hà Nội',
  virtualBalance: 10000000 + i * 500000,
  reputationScore: 4.2,
  createdAt: new Date(Date.now() - i * 86400000 * 10).toISOString(),
  lastLogin: new Date(Date.now() - i * 86400000).toISOString(),
}));

const MOCK_CONTRACTS = Array.from({ length: 6 }).map((_, i) => ({
  _id: `c${i + 1}`,
  contractCode: `HD-00${i + 1}`,
  farmerName: `Nông dân ${i + 1}`,
  enterpriseName: `Doanh nghiệp ${i + 1}`,
  productName: 'Gạo ST25',
  quantity: 1000,
  unit: 'kg',
  pricePerUnit: 25000,
  totalValue: 25000000,
  depositAmount: 5000000,
  status: ['pending', 'active', 'completed', 'cancelled'][i % 4],
  signedByFarmer: true,
  signedByEnterprise: i % 2 === 0,
  deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  createdAt: new Date(Date.now() - i * 86400000 * 5).toISOString(),
}));

const MOCK_DISPUTES = Array.from({ length: 3 }).map((_, i) => ({
  _id: `d${i + 1}`,
  contractId: { contractCode: `HD-000${i + 1}`, totalValue: 25000000 },
  raisedBy: { fullName: `Người dùng ${i + 1}` },
  raisedByRole: i % 2 === 0 ? 'farmer' : 'enterprise',
  reason: 'Sản phẩm giao không đúng số lượng đã thỏa thuận trong hợp đồng.',
  status: ['open', 'under_review', 'resolved_farmer'][i % 3],
  milestoneStep: 2,
  evidence: ['https://example.com/evidence1.jpg'],
  createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
}));

const MOCK_TRANSACTIONS = Array.from({ length: 10 }).map((_, i) => ({
  _id: `t${i + 1}`,
  type: ['topup', 'escrow_deposit', 'escrow_release', 'refund', 'commission'][i % 5],
  userId: { fullName: `Người dùng ${i + 1}`, email: `user${i + 1}@gmail.com` },
  amount: 1000000 + i * 250000,
  paymentMethod: ['sepay', 'internal', 'demo'][i % 3],
  description: 'Giao dịch demo dữ liệu mẫu',
  status: ['completed', 'pending', 'failed', 'cancelled'][i % 4],
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

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

const paginate = (list, page = 1, limit = 20) => {
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);
  return {
    data,
    pagination: {
      page,
      total: list.length,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
    },
  };
};

// ════════════════════════════════════════
// adminService — dùng mock cho tới khi BE có route /admin/*
// ════════════════════════════════════════
const adminService = {
  // ── Dashboard ──
  getDashboard: async () => {
    await delay();
    return { success: true, data: MOCK_DASHBOARD };
  },

  // ── Users ──
  getUsers: async (params = {}) => {
    await delay();
    let list = [...MOCK_USERS];
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(u => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (params.role) list = list.filter(u => u.role === params.role);
    if (params.isActive !== undefined && params.isActive !== '') {
      list = list.filter(u => String(u.isActive) === String(params.isActive));
    }
    const result = paginate(list, params.page, params.limit);
    return { success: true, ...result };
  },

  getUserDetail: async (userId) => {
    await delay();
    const user = MOCK_USERS.find(u => u._id === userId) || MOCK_USERS[0];
    return { success: true, data: { user, contractCount: 4, transactionCount: 9 } };
  },

  toggleUserStatus: async (userId) => {
    await delay(300);
    const user = MOCK_USERS.find(u => u._id === userId);
    if (user) user.isActive = !user.isActive;
    return { success: true };
  },

  deleteUser: async (userId) => {
    await delay(300);
    const idx = MOCK_USERS.findIndex(u => u._id === userId);
    if (idx !== -1) MOCK_USERS.splice(idx, 1);
    return { success: true };
  },

  // ── Contracts ──
  getContracts: async (params = {}) => {
    await delay();
    let list = [...MOCK_CONTRACTS];
    if (params.search) {
      const s = params.search.toLowerCase();
      list = list.filter(c =>
        c.contractCode.toLowerCase().includes(s) ||
        c.farmerName.toLowerCase().includes(s) ||
        c.enterpriseName.toLowerCase().includes(s)
      );
    }
    if (params.status) list = list.filter(c => c.status === params.status);
    const result = paginate(list, params.page, params.limit);
    return { success: true, ...result };
  },

  getContractDetail: async (contractId) => {
    await delay();
    const contract = MOCK_CONTRACTS.find(c => c._id === contractId) || MOCK_CONTRACTS[0];
    return { success: true, data: { contract, dispute: null } };
  },

  // ── Disputes ──
  getDisputes: async (params = {}) => {
    await delay();
    let list = [...MOCK_DISPUTES];
    if (params.status) list = list.filter(d => d.status === params.status);
    const result = paginate(list, params.page, params.limit);
    return { success: true, ...result };
  },

  getDisputeDetail: async (id) => {
    await delay();
    const dispute = MOCK_DISPUTES.find(d => d._id === id) || MOCK_DISPUTES[0];
    return { success: true, data: { dispute } };
  },

  resolveDispute: async (id, resolution, adminNotes) => {
    await delay(400);
    const dispute = MOCK_DISPUTES.find(d => d._id === id);
    if (dispute) {
      dispute.status = resolution === 'farmer' ? 'resolved_farmer' : 'resolved_enterprise';
      dispute.adminNotes = adminNotes;
      dispute.resolvedAt = new Date().toISOString();
    }
    return { success: true };
  },

  // ── Transactions ──
  getTransactions: async (params = {}) => {
    await delay();
    let list = [...MOCK_TRANSACTIONS];
    if (params.type) list = list.filter(t => t.type === params.type);
    if (params.status) list = list.filter(t => t.status === params.status);
    const result = paginate(list, params.page, params.limit);

    const stats = {
      topup:          { totalAmount: 145000000, count: 32 },
      escrow_deposit: { totalAmount: 98000000,  count: 21 },
      escrow_release: { totalAmount: 76000000,  count: 18 },
      refund:         { totalAmount: 12000000,  count: 5  },
    };

    return { success: true, ...result, stats };
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