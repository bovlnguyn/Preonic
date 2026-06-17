export const farmerStats = [
  {
    id: 'active-products',
    label: 'Nông sản đang bán',
    value: '12',
    change: '+3 sản phẩm mới',
    tone: 'green',
  },
  {
    id: 'active-contracts',
    label: 'Hợp đồng hiệu lực',
    value: '05',
    change: '2 hợp đồng chờ xác nhận',
    tone: 'blue',
  },
  {
    id: 'wallet',
    label: 'Số dư khả dụng',
    value: '84,4tr',
    change: '+18% so với tháng trước',
    tone: 'gold',
  },
  {
    id: 'reputation',
    label: 'Điểm uy tín',
    value: '4.8/5',
    change: 'Dựa trên 19 giao dịch',
    tone: 'purple',
  },
];

export const cropProducts = [
  {
    id: 'NS-2406-01',
    name: 'Gạo hữu cơ ST25',
    category: 'Lúa gạo',
    location: 'Đồng Tháp',
    quantity: '12 tấn',
    price: 18500000,
    standard: 'VietGAP',
    harvestDate: '2026-07-18',
    progress: 76,
    status: 'Đang chào bán',
  },
  {
    id: 'NS-2406-02',
    name: 'Sầu riêng Ri6 loại 1',
    category: 'Trái cây',
    location: 'Đắk Lắk',
    quantity: '8 tấn',
    price: 68000000,
    standard: 'Truy xuất QR',
    harvestDate: '2026-07-02',
    progress: 91,
    status: 'Đang đàm phán',
  },
  {
    id: 'NS-2406-03',
    name: 'Rau cải xanh hữu cơ',
    category: 'Rau củ',
    location: 'Đà Nẵng',
    quantity: '1.6 tấn',
    price: 14500000,
    standard: 'Organic',
    harvestDate: '2026-06-28',
    progress: 63,
    status: 'Sẵn sàng thu hoạch',
  },
  {
    id: 'NS-2406-04',
    name: 'Cà phê Robusta sạch',
    category: 'Cà phê',
    location: 'Lâm Đồng',
    quantity: '5 tấn',
    price: 72000000,
    standard: 'OCOP',
    harvestDate: '2026-08-12',
    progress: 48,
    status: 'Đang chăm sóc',
  },
];

export const farmerContracts = [
  {
    id: 'HD-1024',
    buyer: 'Công ty Green Food Việt Nam',
    product: 'Gạo hữu cơ ST25',
    value: 222000000,
    status: 'Đang hiệu lực',
    signedDate: '2026-06-01',
    deadline: '2026-07-20',
    progress: 58,
  },
  {
    id: 'HD-1025',
    buyer: 'Chuỗi siêu thị FreshMart',
    product: 'Rau cải xanh hữu cơ',
    value: 46400000,
    status: 'Chờ nông dân xác nhận',
    signedDate: '2026-06-11',
    deadline: '2026-06-30',
    progress: 24,
  },
  {
    id: 'HD-1026',
    buyer: 'Nông sản xuất khẩu An Phú',
    product: 'Sầu riêng Ri6 loại 1',
    value: 544000000,
    status: 'Đang đàm phán',
    signedDate: '2026-06-14',
    deadline: '2026-07-05',
    progress: 12,
  },
];

export const farmerOrders = [
  {
    id: 'DH-7821',
    contractId: 'HD-1024',
    buyer: 'Green Food Việt Nam',
    product: 'Gạo hữu cơ ST25',
    quantity: '5 tấn',
    status: 'Đang chuẩn bị hàng',
    deliveryDate: '2026-07-12',
    address: 'Kho Green Food, TP. Hồ Chí Minh',
  },
  {
    id: 'DH-7822',
    contractId: 'HD-1025',
    buyer: 'FreshMart',
    product: 'Rau cải xanh hữu cơ',
    quantity: '800 kg',
    status: 'Chờ lịch lấy hàng',
    deliveryDate: '2026-06-29',
    address: 'Trung tâm phân phối Đà Nẵng',
  },
  {
    id: 'DH-7823',
    contractId: 'HD-1026',
    buyer: 'An Phú Export',
    product: 'Sầu riêng Ri6 loại 1',
    quantity: '3 tấn',
    status: 'Đợi ký quỹ',
    deliveryDate: '2026-07-08',
    address: 'Kho lạnh An Phú, Bình Dương',
  },
];

export const farmerEscrows = [
  {
    id: 'ES-4412',
    contractId: 'HD-1024',
    buyer: 'Green Food Việt Nam',
    amount: 222000000,
    released: 87000000,
    status: 'Đã ký quỹ',
    milestone: 'Giao 40% sản lượng đầu tiên',
  },
  {
    id: 'ES-4413',
    contractId: 'HD-1025',
    buyer: 'FreshMart',
    amount: 46400000,
    released: 0,
    status: 'Chờ ký quỹ',
    milestone: 'Xác nhận hợp đồng',
  },
  {
    id: 'ES-4414',
    contractId: 'HD-1026',
    buyer: 'An Phú Export',
    amount: 544000000,
    released: 0,
    status: 'Đang tạo lệnh',
    milestone: 'Doanh nghiệp đặt cọc 30%',
  },
];

export const walletSummary = {
  balance: 84450000,
  pending: 135000000,
  releasedThisMonth: 87000000,
  platformFee: 2610000,
};

export const walletTransactions = [
  { id: 'TX-3001', type: 'Nhận tiền', note: 'Giải ngân mốc HD-1024', amount: 87000000, date: '2026-06-12' },
  { id: 'TX-3002', type: 'Phí nền tảng', note: 'Phí giao dịch HD-1024', amount: -2610000, date: '2026-06-12' },
  { id: 'TX-3003', type: 'Nạp ví', note: 'Nạp thử nghiệm', amount: 1000000, date: '2026-06-09' },
  { id: 'TX-3004', type: 'Rút tiền', note: 'Rút về ngân hàng liên kết', amount: -45000000, date: '2026-06-03' },
];

export const partnerRatings = [
  {
    id: 'R-01',
    partner: 'Green Food Việt Nam',
    role: 'Doanh nghiệp thu mua',
    score: 4.8,
    contracts: 12,
    comment: 'Thanh toán đúng hạn, quy trình nhận hàng rõ ràng.',
  },
  {
    id: 'R-02',
    partner: 'FreshMart',
    role: 'Chuỗi bán lẻ',
    score: 4.6,
    contracts: 7,
    comment: 'Yêu cầu chất lượng cao, phù hợp nông sản sạch.',
  },
  {
    id: 'R-03',
    partner: 'An Phú Export',
    role: 'Xuất khẩu nông sản',
    score: 4.7,
    contracts: 9,
    comment: 'Đơn hàng lớn, cần chuẩn hóa chứng từ và lịch giao.',
  },
];

export const weatherCards = [
  {
    province: 'Đà Nẵng',
    temp: 31,
    humidity: 76,
    wind: 12,
    condition: 'Nắng nhẹ',
    risk: 'Mưa rào cuối chiều',
    advice: 'Ưu tiên thu hoạch buổi sáng, che phủ luống rau sau 15:00.',
  },
  {
    province: 'Đắk Lắk',
    temp: 30,
    humidity: 69,
    wind: 14,
    condition: 'Có mây',
    risk: 'Gió mạnh',
    advice: 'Gia cố cây ăn quả, kiểm tra neo chống đổ.',
  },
  {
    province: 'Đồng Tháp',
    temp: 32,
    humidity: 81,
    wind: 11,
    condition: 'Mưa rào',
    risk: 'Ngập úng thấp',
    advice: 'Không phun thuốc trước mưa, mở rãnh thoát nước.',
  },
];

export const insurancePlans = [
  {
    id: 'BH-01',
    name: 'Bảo hiểm mùa vụ cơ bản',
    provider: 'PreOnic Protect',
    cover: 'Mưa bão, hạn hán, ngập úng',
    price: 'Từ 1.2% giá trị mùa vụ',
  },
  {
    id: 'BH-02',
    name: 'Bảo hiểm hợp đồng bao tiêu',
    provider: 'Green Shield',
    cover: 'Rủi ro giao hàng, mất mùa, chậm thanh toán',
    price: 'Từ 1.8% giá trị hợp đồng',
  },
  {
    id: 'BH-03',
    name: 'Bảo hiểm kho nông sản',
    provider: 'AgriSafe',
    cover: 'Cháy nổ, ẩm mốc, thiệt hại lưu kho',
    price: 'Từ 350.000đ/tháng',
  },
];

export const productCategories = ['Lúa gạo', 'Rau củ', 'Trái cây', 'Cà phê', 'Hồ tiêu', 'Thảo dược', 'Nông sản hữu cơ'];
export const provinces = ['Đà Nẵng', 'Quảng Nam', 'Lâm Đồng', 'Đắk Lắk', 'Cần Thơ', 'Đồng Tháp', 'Nghệ An'];
export const standards = ['VietGAP', 'GlobalGAP', 'Organic', 'OCOP', 'Truy xuất QR', 'Canh tác sạch'];
