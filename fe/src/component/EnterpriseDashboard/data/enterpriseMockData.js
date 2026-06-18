
// Dùng khi chưa có backend. Khi API sẵn sàng, thay từng hằng số bằng

export const enterpriseStats = [
  { id: 'total-contracts',  label: 'Tổng hợp đồng',           value: '24',      change: '+3 hợp đồng mới tháng này',    tone: 'blue'   },
  { id: 'active-contracts', label: 'Đang thực hiện',           value: '08',      change: '5 chờ xác nhận',               tone: 'green'  },
  { id: 'escrow-locked',    label: 'Ký quỹ đang giữ',          value: '4,2 tỷ',  change: 'Từ 8 hợp đồng escrow',         tone: 'gold'   },
  { id: 'reputation',       label: 'Điểm uy tín',              value: '4.6/5',   change: 'Dựa trên 42 giao dịch',        tone: 'purple' },
];

export const enterpriseContracts = [
  { id: 'PRE-2026-0041', farmer: 'Nguyễn Văn Tám',  product: 'Gạo hữu cơ ST25',      quantity: '20 tấn', value: 370000000, signedDate: '2026-04-10', deliveryDate: '2026-07-20', progress: 68,  status: 'Đang thực hiện'   },
  { id: 'PRE-2026-0038', farmer: 'Trần Thị Lan',    product: 'Sầu riêng Ri6 loại 1', quantity: '10 tấn', value: 680000000, signedDate: '2026-04-01', deliveryDate: '2026-07-05', progress: 91,  status: 'Chờ giao hàng'    },
  { id: 'PRE-2026-0035', farmer: 'Lê Hữu Phước',   product: 'Cà phê Robusta sạch',  quantity: '8 tấn',  value: 576000000, signedDate: '2026-03-18', deliveryDate: '2026-08-15', progress: 44,  status: 'Đang thực hiện'   },
  { id: 'PRE-2026-0032', farmer: 'Phạm Minh Tuấn', product: 'Hồ tiêu đen Phú Quốc', quantity: '3 tấn',  value: 252000000, signedDate: '2026-03-05', deliveryDate: '2026-06-30', progress: 100, status: 'Hoàn thành'        },
  { id: 'PRE-2026-0028', farmer: 'Võ Thị Hoa',     product: 'Rau cải hữu cơ',       quantity: '5 tấn',  value: 72500000,  signedDate: '2026-02-20', deliveryDate: '2026-06-10', progress: 0,   status: 'Đã hủy'           },
];

export const enterpriseOrders = [
  { id: 'ORD-2026-0082', contractId: 'PRE-2026-0041', product: 'Gạo hữu cơ ST25',      farmer: 'Nguyễn Văn Tám',  quantity: '20 tấn', deliveryDate: '2026-07-20', address: 'Kho B3, KCN Trà Nóc, Cần Thơ',    milestone: 'Bước 3/5 — Đang vận chuyển',     status: 'Đang vận chuyển'    },
  { id: 'ORD-2026-0081', contractId: 'PRE-2026-0038', product: 'Sầu riêng Ri6 loại 1', farmer: 'Trần Thị Lan',    quantity: '10 tấn', deliveryDate: '2026-07-05', address: 'Cảng Cát Lái, TP. HCM',            milestone: 'Bước 4/5 — Kiểm tra chất lượng', status: 'Chờ kiểm tra CL'    },
  { id: 'ORD-2026-0079', contractId: 'PRE-2026-0035', product: 'Cà phê Robusta sạch',  farmer: 'Lê Hữu Phước',   quantity: '8 tấn',  deliveryDate: '2026-08-15', address: 'Kho D1, KCN Hòa Phú, Lâm Đồng', milestone: 'Bước 2/5 — Chuẩn bị hàng',       status: 'Đang chuẩn bị'      },
];

export const enterpriseEscrows = [
  { id: 'ESC-2026-0041', contractId: 'PRE-2026-0041', farmer: 'Nguyễn Văn Tám',  product: 'Gạo hữu cơ ST25',      amount: 370000000, released: 148000000, milestone: 'Bước 3/5 — Đang vận chuyển',     status: 'Đang giải ngân' },
  { id: 'ESC-2026-0038', contractId: 'PRE-2026-0038', farmer: 'Trần Thị Lan',    product: 'Sầu riêng Ri6 loại 1', amount: 680000000, released: 544000000, milestone: 'Bước 4/5 — Kiểm tra CL',          status: 'Chờ xác nhận'   },
  { id: 'ESC-2026-0035', contractId: 'PRE-2026-0035', farmer: 'Lê Hữu Phước',   product: 'Cà phê Robusta sạch',  amount: 576000000, released: 0,          milestone: 'Bước 2/5 — Chuẩn bị hàng',       status: 'Đang ký quỹ'    },
];

export const enterpriseWalletSummary = {
  balance:         1240000000,
  escrowLocked:    1626000000,
  spentThisMonth:   892000000,
  pendingPayment:   380000000,
};

export const enterpriseTransactions = [
  { id: 'TXN-9821', type: 'Ký quỹ',       note: 'Escrow PRE-2026-0041',          date: '2026-04-10', amount: -370000000  },
  { id: 'TXN-9820', type: 'Ký quỹ',       note: 'Escrow PRE-2026-0038',          date: '2026-04-01', amount: -680000000  },
  { id: 'TXN-9805', type: 'Nạp tiền',     note: 'Nạp ví qua SePay',             date: '2026-03-28', amount: 2000000000  },
  { id: 'TXN-9798', type: 'Giải ngân',    note: 'Hoàn tất PRE-2026-0028',       date: '2026-03-20', amount:  252000000  },
  { id: 'TXN-9790', type: 'Phí nền tảng', note: 'Hoa hồng 3% — PRE-2026-0032', date: '2026-03-05', amount:   -7560000  },
  { id: 'TXN-9784', type: 'Giải ngân',    note: 'Đợt 2 PRE-2026-0035',         date: '2026-02-28', amount: -148000000  },
];

export const enterpriseSuppliers = [
  { id: 'SUP-001', name: 'Nguyễn Văn Tám',  location: 'Đồng Tháp',  products: ['Gạo ST25', 'Nếp cái hoa vàng'],   contracts: 5, completedContracts: 4, totalValue: 1420000000, rating: 4.8, status: 'Đang hợp tác' },
  { id: 'SUP-002', name: 'Trần Thị Lan',    location: 'Đắk Lắk',   products: ['Sầu riêng Ri6', 'Mít Thái'],       contracts: 3, completedContracts: 2, totalValue: 2040000000, rating: 4.6, status: 'Đang hợp tác' },
  { id: 'SUP-003', name: 'Lê Hữu Phước',   location: 'Lâm Đồng',  products: ['Cà phê Robusta', 'Cà phê Arabica'],contracts: 7, completedContracts: 7, totalValue: 4032000000, rating: 4.9, status: 'Hoàn thành'    },
  { id: 'SUP-004', name: 'Phạm Minh Tuấn', location: 'Kiên Giang', products: ['Hồ tiêu đen', 'Hồ tiêu đỏ'],      contracts: 4, completedContracts: 3, totalValue:  756000000, rating: 4.5, status: 'Đang hợp tác' },
];

export const enterpriseProducts = [
  { id: 'PROD-001', name: 'Gạo hữu cơ ST25',      category: 'Lúa gạo',  location: 'Đồng Tháp',  farmer: 'Nguyễn Văn Tám',  pricePerTon: 18500000, quantity: '35 tấn',  badge: 'VietGAP',    rating: 4.9, region: 'Miền Nam',   progress: 71 },
  { id: 'PROD-002', name: 'Sầu riêng Ri6 loại 1', category: 'Trái cây', location: 'Đắk Lắk',   farmer: 'Trần Thị Lan',    pricePerTon: 68000000, quantity: '8 tấn',   badge: 'GlobalGAP',  rating: 4.8, region: 'Tây Nguyên', progress: 73 },
  { id: 'PROD-003', name: 'Cà phê Robusta sạch',  category: 'Cà phê',   location: 'Lâm Đồng',  farmer: 'Lê Hữu Phước',   pricePerTon: 72000000, quantity: '22 tấn',  badge: '4C',         rating: 4.9, region: 'Tây Nguyên', progress: 56 },
  { id: 'PROD-004', name: 'Hồ tiêu đen Phú Quốc', category: 'Gia vị',   location: 'Kiên Giang', farmer: 'Phạm Minh Tuấn', pricePerTon: 88000000, quantity: '4 tấn',   badge: 'OCOP 5 sao', rating: 5.0, region: 'Miền Nam',   progress: 87 },
  { id: 'PROD-005', name: 'Thanh long ruột đỏ',   category: 'Trái cây', location: 'Bình Thuận', farmer: 'Huỳnh Thị Mai',  pricePerTon: 24000000, quantity: '18 tấn',  badge: 'VietGAP',    rating: 4.7, region: 'Miền Nam',   progress: 60 },
  { id: 'PROD-006', name: 'Rau cải hữu cơ',       category: 'Rau củ',   location: 'Đà Nẵng',   farmer: 'Đỗ Văn Nam',     pricePerTon: 14000000, quantity: '3 tấn',   badge: 'Organic',    rating: 4.6, region: 'Miền Trung', progress: 30 },
];

export const enterpriseRatings = [
  { id: 'RAT-001', partner: 'Nguyễn Văn Tám',  role: 'Nông dân • Đồng Tháp',  score: 4.8, contracts: 5, comment: 'Giao hàng đúng lịch, sản phẩm đạt chuẩn VietGAP. Hợp tác lâu dài đáng tin cậy.' },
  { id: 'RAT-002', partner: 'Trần Thị Lan',    role: 'Nông dân • Đắk Lắk',   score: 4.6, contracts: 3, comment: 'Chất lượng sầu riêng vượt yêu cầu GlobalGAP. Một lần giao chậm 2 ngày có thông báo trước.' },
  { id: 'RAT-003', partner: 'Lê Hữu Phước',   role: 'Nông dân • Lâm Đồng',  score: 4.9, contracts: 7, comment: 'Nhà cung cấp cà phê tốt nhất đang hợp tác. Luôn đủ số lượng cam kết và đạt chứng nhận 4C.' },
  { id: 'RAT-004', partner: 'Phạm Minh Tuấn', role: 'Nông dân • Kiên Giang', score: 4.5, contracts: 4, comment: 'Hồ tiêu OCOP 5 sao, đóng gói cẩn thận. Giá đàm phán lâu nhưng thống nhất được.' },
];

export const enterpriseWeatherCards = [
  { province: 'Cần Thơ',   condition: 'Nhiều mây',  temp: 31, humidity: 78, wind: 12, risk: 'Trung bình', advice: 'Nên thu hoạch lúa trước 18/7 để tránh mưa cuối tháng.' },
  { province: 'Đắk Lắk',  condition: 'Nắng nóng',  temp: 34, humidity: 55, wind: 8,  risk: 'Cao',        advice: 'Nhiệt độ cao ảnh hưởng sầu riêng. Cần tưới bổ sung và kiểm tra độ chín.' },
  { province: 'Lâm Đồng', condition: 'Mưa nhẹ',    temp: 22, humidity: 88, wind: 15, risk: 'Thấp',       advice: 'Điều kiện lý tưởng cho cà phê. Theo dõi độ ẩm để điều chỉnh lịch tưới.' },
];


export const enterpriseInsurancePlans = [
  { id: 'INS-001', provider: 'Bảo Việt Insurance', name: 'Bảo hiểm Chỉ số Lượng mưa', coverages: ['Hạn hán', 'Ngập úng'], hotline: '1900 5515', note: 'Áp dụng cho lúa gạo vùng ĐBSCL' },
  { id: 'INS-002', provider: 'PVI Insurance', name: 'Bảo hiểm Rủi ro Khí hậu', coverages: ['Sương muối', 'Giông lốc'], hotline: '1900 5454', note: 'Tối ưu cho cây cà phê Tây Nguyên' }
];